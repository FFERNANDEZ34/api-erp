import { SignedXml } from "xml-crypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as forge from "node-forge";

export interface SignXmlParams {
  xmlString: string;
  certificateBuffer: Buffer;
  certificatePassword: string;
  rucEmisor: string;
}

export class SunatSignerService {
  /**
   * Firma digital XMLDSIG para comprobantes electrónicos SUNAT.
   */
  public async signInvoice(
    params: SignXmlParams,
  ): Promise<{ signedXml: string; digestValue: string }> {
    try {
      // ============================================================
      // 1. EXTRAER CLAVE PRIVADA Y CERTIFICADO DESDE PFX
      // ============================================================

      const pfxDer = forge.util.createBuffer(
        params.certificateBuffer.toString("binary"),
      );

      const pfxAsn1 = forge.asn1.fromDer(pfxDer);

      const p12 = forge.pkcs12.pkcs12FromAsn1(
        pfxAsn1,
        params.certificatePassword,
      );

      const keyBags = p12.getBags({
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
      });

      const certBags = p12.getBags({
        bagType: forge.pki.oids.certBag,
      });

      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

      const certBag = certBags[forge.pki.oids.certBag]?.[0];

      if (!keyBag?.key || !certBag?.cert) {
        throw new Error(
          "No se pudo extraer la clave privada o certificado desde el archivo PFX.",
        );
      }

      const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);

      const certificatePem = forge.pki.certificateToPem(certBag.cert);

      const cleanCertBody = certificatePem
        .replace(/-----BEGIN CERTIFICATE-----/g, "")
        .replace(/-----END CERTIFICATE-----/g, "")
        .replace(/\r?\n/g, "")
        .trim();

      // ============================================================
      // 2. ALGORITMOS XMLDSIG (SUNAT)
      // ============================================================

      const algorithmSignature = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";

      const algorithmCanonicalization =
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

      const algorithmDigest = "http://www.w3.org/2000/09/xmldsig#sha1";

      const transformEnveloped =
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature";

      // ============================================================
      // 3. CONFIGURAR FIRMA
      // ============================================================

      //   const sig = new SignedXml({
      //     privateKey: privateKeyPem,
      //     publicCert: certificatePem,
      //     signatureAlgorithm: algorithmSignature,
      //     canonicalizationAlgorithm: algorithmCanonicalization,
      //   });
      const sig = new SignedXml({
        privateKey: privateKeyPem,
        publicCert: certificatePem,
        signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
        canonicalizationAlgorithm:
          "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
         
      });

      //   sig.addReference({
      //     xpath: "/*",
      //     transforms: [
      //       transformEnveloped,
      //       algorithmCanonicalization,
      //     ],
      //     digestAlgorithm: algorithmDigest,
      //   });
      sig.addReference({
        xpath: "/*",
        transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"],
        digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      });

      // ============================================================
      // 4. INFORMACIÓN X509
      // ============================================================

        (sig as any).keyInfoProvider = {
          getKeyInfo(): string {
            return `
              <ds:X509Data>
                <ds:X509Certificate>${cleanCertBody}</ds:X509Certificate>
              </ds:X509Data>
            `;
          },
        };

      console.log("[SUNAT SIGNER] Iniciando proceso de firmado XML...");

      // ============================================================
      // 5. GENERAR FIRMA
      // ============================================================

      sig.computeSignature(params.xmlString, {
        prefix: "ds",
        location: {
          reference: "/*",
          action: "append" // Coloca el ds:Signature de manera elegante al final del documento
        }
      });

      const signedXml = sig.getSignedXml();

      // ============================================================
      // 6. EXTRAER DIGEST VALUE
      // ============================================================

      const signedDom = new DOMParser().parseFromString(signedXml, "text/xml");

//----------------------------------------------------------------/
 const referenceNode = signedDom.getElementsByTagName("ds:Reference").item(0);
      if (referenceNode) {
        referenceNode.setAttribute("URI", ""); // SUNAT exige que apunte de forma global enveloped
      }

      // Removemos de forma segura el atributo Id o ID inyectado automáticamente en la raíz
      const invoiceNode = signedDom.documentElement;
      if (invoiceNode && (invoiceNode.hasAttribute("Id") || invoiceNode.hasAttribute("ID"))) {
        invoiceNode.removeAttribute("Id");
        invoiceNode.removeAttribute("ID");
      }
//---------------------------------------------------------------/


      const digestNodes = signedDom.getElementsByTagName("ds:DigestValue");

      const digestValue =
        digestNodes.length > 0 ? digestNodes[0].textContent?.trim() || "" : "";

      console.log(
        `🔒 [CRIPTOGRAFÍA] Firmado exitoso. DigestValue: ${digestValue}`,
      );

      // ============================================================
      // 7. SERIALIZAR XML
      // ============================================================

      const finalXmlString = new XMLSerializer().serializeToString(signedDom);


      return {
        signedXml: finalXmlString,
        digestValue,
      };
    } catch (error: any) {
      console.error("🚨 [ERROR FIRMADOR CRIPTOGRÁFICO]", error);

      throw new Error(
        `Fallo en el timbrado digital del comprobante: ${error.message}`,
      );
    }
  }
}
