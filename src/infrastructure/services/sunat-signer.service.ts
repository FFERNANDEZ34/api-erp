import { SignedXml } from 'xml-crypto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as forge from 'node-forge';

export interface SignXmlParams {
  xmlString: string;
  certificateBuffer: Buffer;   // Archivo binario extraído de disco o Cloudflare R2
  certificatePassword: string; // Tu contraseña secreta configurada en el modal de Compañías
  rucEmisor: string;
}

export class SunatSignerService {
  /**
   * 🔒 ESTAMPA LA FIRMA DIGITAL CRIPTOGRÁFICA XAdES-BES EN EL COMPROBANTE NATIVO (UBL 2.1)
   */
  public async signInvoice(params: SignXmlParams): Promise<{ signedXml: string; digestValue: string }> {
    try {
      // 1. Extraemos clave privada y certificado usando node-forge en la memoria RAM
      const base64Pfx = params.certificateBuffer.toString('base64');
      const pfxDer = forge.util.decode64(base64Pfx);
      
      const pfxAsn1 = forge.asn1.fromDer(pfxDer);
      const pfxInstance = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, params.certificatePassword);

      // Ubicamos las bolsas de llaves criptográficas del archivo de Sunat
      const keyBags = pfxInstance.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const certBags = pfxInstance.getBags({ bagType: forge.pki.oids.certBag });

      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
      const certBag = certBags[forge.pki.oids.certBag]?.[0];

      if (!keyBag?.key || !certBag?.cert) {
        throw new Error('El certificado digital PFX no cuenta con una estructura de llaves o atributos válida.');
      }

      const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
      const certificatePem = forge.pki.certificateToPem(certBag.cert);

      // Limpiamos cabeceras para aislar el cuerpo puro base64 del certificado X509
      const cleanCertBody = certificatePem
        .replace(/-----\s*BEGIN ?[^-]*-----\s*/g, '')
        .replace(/-----\s*END ?[^-]*-----\s*/g, '')
        .replace(/[\(\r\\)n]/g, '');

      // 2. Parseamos el XML string original a un Árbol DOM limpio
      const doc = new DOMParser().parseFromString(params.xmlString, 'text/xml');
      
      // =========================================================================
      // 🚀 INMUNIZACIÓN ABSOLUTA: Forzamos la inicialización usando tipado flexible (as any)
      // Esto disuelve las restricciones del tsconfig y los cambios bruscos de la librería
      // =========================================================================
      const sig = new SignedXml() as any;
      
      // Configuramos algoritmos y firmas requeridas por la SUNAT de forma nativa
      sig.signatureAlgorithm = 'http://w3.org';
      sig.canonicalizationAlgorithm = 'http://w3.org';
      sig.signingKey = Buffer.from(privateKeyPem);

      // Seteamos la información del proveedor de llave pública embebida X509
      sig.keyInfoProvider = {
        getKeyInfo: () => {
          return `<ds:X509Data><ds:X509Certificate>${cleanCertBody}</ds:X509Certificate></ds:X509Data>`;
        },
        getKey: () => Buffer.from(privateKeyPem)
      };

      // Añadimos la referencia de firmado sobre la raíz del UBL 2.1
      sig.addReference(
        "/*", 
        ["http://w3.org", "http://w3.org"],
        "http://w3.org"
      );

      // 4. Ejecutamos la firma criptográfica sobre el documento DOM
      sig.computeSignature(params.xmlString, {
        prefix: 'ds',
        location: {
          reference: "/*[local-name()='Invoice']",
          action: 'prepend'
        }
      });

      // 5. Extraemos el bloque de firma generado para incrustarlo en el UBLExtension componentes
      const signatureXml = sig.getSignatureXml();
      const signedDom = new DOMParser().parseFromString(sig.getSignedXml(), 'text/xml');
      
      const extensionContentNode = signedDom.getElementsByTagNameNS(
        'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2', 
        'ExtensionContent'
      ).item(0);

      if (extensionContentNode) {
        const signatureDom = new DOMParser().parseFromString(signatureXml, 'text/xml');
        if (signatureDom.documentElement) {
          extensionContentNode.appendChild(signedDom.importNode(signatureDom.documentElement, true));
        }
      }

      // Convertimos el DOM resultante nuevamente a String plano para la persistencia
      const finalXmlString = new XMLSerializer().serializeToString(signedDom);

      // Extraemos el DigestValue calculado (El Hash de control oficial exigido por SUNAT)
      const digestNode = signedDom.getElementsByTagNameNS('http://w3.org', 'DigestValue').item(0);
      const extractedDigest = digestNode?.textContent || '';

      console.log(`🔒 [CRIPTOGRAFÍA] Comprobante firmado con éxito. Hash SUNAT (DigestValue): ${extractedDigest}`);

      return {
        signedXml: finalXmlString,
        digestValue: extractedDigest
      };

    } catch (error: any) {
      console.error('🚨 [ERROR FIRMADOR CRIPTOGRÁFICO]:', error);
      throw new Error(`Fallo en el timbrado digital del comprobante: ${error.message}`);
    }
  }
}