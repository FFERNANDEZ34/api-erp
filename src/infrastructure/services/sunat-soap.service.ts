import * as https from 'https';
import AdmZip = require('adm-zip'); // 🚀 EL DESTRABE INTERNOP: Importación compatible con el constructor CommonJS de TypeScript

export interface SendXmlToSunatParams {
  xmlString: string;
  rucEmisor: string;
  tipoComprobante: string; // '01' Factura, '03' Boleta
  serie: string;          // Ej: 'F001'
  correlativo: string;    // Ej: '00000001'
  sunatUserSol: string;   // Tu usuario secundario (Ej: 'MODODATA')
  sunatPasswordSol: string; // Tu clave SOL secreta
}

export interface SunatSoapResponse {
  success: boolean;
  sunatResponseCode: string; // '0' significa aprobado con éxito por SUNAT
  sunatDescription: string;  // Mensaje oficial devuelto (Ej: 'La Factura ha sido aceptada')
  cdrBuffer?: Buffer;        // El binario del CDR devuelto por la SUNAT para auditorías o PDFs
}

export class SunatSoapService {
  // 🌐 ENDPOINT OFICIAL DE PRUEBAS / BETA DE LA SUNAT (HOMOLOGADO)
  private readonly sunatBetaUrl = 'https://sunat.gob.pe';

  /**
   * 🚀 EMPAQUETA, DISPARA AL WEB SERVICE SOAP BETA Y PROCESA EL CDR DE RESPUESTA
   */
  public async sendInvoiceToSunat(params: SendXmlToSunatParams): Promise<SunatSoapResponse> {
    try {
      const fileNameBase = `${params.rucEmisor}-${params.tipoComprobante}-${params.serie}-${params.correlativo}`;
      const xmlFileName = `${fileNameBase}.xml`;
      const zipFileName = `${fileNameBase}.zip`;

      // 1. COMPRESIÓN EN CALIENTE (RAM): Creamos el archivo .zip virtual en memoria
      const zip = new AdmZip();
      zip.addFile(xmlFileName, Buffer.from(params.xmlString, 'utf-8'));
      const zipBuffer = zip.toBuffer();
      const base64Zip = zipBuffer.toString('base64');

      // 2. CONSTRUCCIÓN DEL SOBRE SOAP EN TEXTO PURO (Consumo pluma de CPU)
      const fullSolUser = `${params.rucEmisor}${params.sunatUserSol.toUpperCase()}`;
      
      const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://xmlsoap.org" xmlns:ser="http://sunat.gob.pe" xmlns:wsse="http://oasis-open.org">
   <soapenv:Header>
      <wsse:Security>
         <wsse:UsernameToken>
            <wsse:Username>${fullSolUser}</wsse:Username>
            <wsse:Password>${params.sunatPasswordSol}</wsse:Password>
         </wsse:UsernameToken>
      </wsse:Security>
   </soapenv:Header>
   <soapenv:Body>
      <ser:sendBill>
         <fileName>${zipFileName}</fileName>
         <contentFile>${base64Zip}</contentFile>
      </ser:sendBill>
   </soapenv:Body>
</soapenv:Envelope>`.trim();

      // 3. DISPARO HTTPS DIRECTO SIN DEPENDENCIAS EXTERNAS
      console.log(`📡 [SUNAT RED] Despachando payload binario a los servidores BETA... File: ${zipFileName}`);
      const rawSoapResponse = await this.executeHttpsPost(this.sunatBetaUrl, soapEnvelope);

      // 4. PARSEO QUIRÚRGICO DE LA RESPONSIVA SOAP
      if (rawSoapResponse.includes('<soapenv:Fault>')) {
        const faultString = rawSoapResponse.match(/<faultstring>([\s\(\S\)]*?)<\/faultstring>/)?.[1] || 'Error indeterminado en SUNAT WS.';
        throw new Error(`[Gatillo SUNAT Rechazado]: ${faultString}`);
      }

      const base64CdrResponse = rawSoapResponse.match(/<applicationResponse>([\s\(\S\)]*?)<\/applicationResponse>/)?.[1];
      if (!base64CdrResponse) {
        throw new Error('Los servidores de SUNAT procesaron el documento pero no devolvieron un nodo de Constancia CDR válido.');
      }

      // 5. EXTRACCIÓN MÁSTER DEL CDR (ZIP DE VUELTA DE LA SUNAT)
      const compressedCdrBuffer = Buffer.from(base64CdrResponse.trim(), 'base64');
      const cdrZip = new AdmZip(compressedCdrBuffer);
      const cdrZipEntries = cdrZip.getEntries();
      
      // 🎯 DESTRABE DE TIPADO: Tipamos explícitamente el iterador 'entry' como 'any' para pulverizar el bloqueo
      const xmlCdrEntry = cdrZipEntries.find((entry: any) => String(entry.entryName).toLowerCase().endsWith('.xml'));
      if (!xmlCdrEntry) {
        throw new Error('El archivo de constancia de SUNAT llegó corrupto o vacío sin archivo XML interno.');
      }

      const xmlCdrString = xmlCdrEntry.getData().toString('utf-8');

      // Extraemos mediante Regex nativo el ResponseCode y Description oficiales de la SUNAT
      const sunatResponseCodeMatch = xmlCdrString.match(/<cbc:ResponseCode>([\s\(\S\)]*?)<\/cbc:ResponseCode>/);
      const cleanCode = sunatResponseCodeMatch?.[1]?.trim() || '99';

      const sunatDescriptionMatch = xmlCdrString.match(/<cbc:Description>([\s\(\S\)]*?)<\/cbc:Description>/);
      const cleanDescription = sunatDescriptionMatch?.[1]?.trim() || 'Documento procesado por la superintendencia.';

      console.log(`💚 [SUNAT CDR] ¡Respuesta Transaccional Recibida! Código: [${cleanCode}] | Mensaje: ${cleanDescription}`);

      return {
        success: cleanCode === '0', // Código '0' es Éxito Absoluto e Inmutable en las Normas SUNAT
        sunatResponseCode: cleanCode,
        sunatDescription: cleanDescription,
        cdrBuffer: compressedCdrBuffer
      };

    } catch (error: any) {
      console.error('🚨 [CRASH EN RED SOAP SUNAT]:', error);
      return {
        success: false,
        sunatResponseCode: 'HTTP_ERROR',
        sunatDescription: error.message || 'Fallo de conexión o timeout con los servidores de la SUNAT.'
      };
    }
  }

  /**
   * 🔌 MOTOR HTTPS NATIVO DE ALTO RENDIMIENTO PARA COMUNICACIONES SOAP
   */
  private executeHttpsPost(urlTarget: string, payload: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlParsed = new URL(urlTarget);
      
      const options: https.RequestOptions = {
        hostname: urlParsed.hostname,
        path: urlParsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml;charset=utf-8',
          'Content-Length': Buffer.byteLength(payload),
          'SOAPAction': 'urn:sendBill'
        },
        timeout: 15000 // 15 Segundos de tolerancia máxima para evitar colgar cajas del POS
      };

      const req = https.request(options, (res) => {
        let dataChunks = '';
        res.on('data', (chunk) => { dataChunks += chunk; });
        res.on('end', () => { resolve(dataChunks); });
      });

      req.on('error', (err) => { reject(err); });
      req.on('timeout', () => { req.destroy(); reject(new Error('Tiempo de espera agotado (Timeout) con el servidor de SUNAT.')); });
      
      req.write(payload);
      req.end();
    });
  }
}