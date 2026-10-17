import { InvoiceHeaderModel } from "../../../infrastructure/database/models/invoice-header.model";
import { AttachmentModel } from "../../../infrastructure/database/models/attachment.model";
import axios from "axios";

export interface DownloadXmlInput {
  invoiceId: number;
  subscriptionId: number; // 🎯 FILTRO MULTI-TENANT: Seguridad de datos mandatoria
}

export interface DownloadXmlOutput {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

export class DownloadXmlUseCase {
  public async execute(input: DownloadXmlInput): Promise<DownloadXmlOutput> {
    // 1. Validar la existencia de la factura bajo el perímetro del inquilino
    const invoice = await InvoiceHeaderModel.findOne({
      where: { id: input.invoiceId, subscriptionId: input.subscriptionId }
    });

    if (!invoice) {
      throw new Error("El comprobante electrónico seleccionado no existe en el sistema.");
    }

    // 2. 🔍 CONSULTA ESTRUCTURADA EN TU TABLA 'sys_attachments'
    // Buscamos el registro del XML utilizando tus columnas de auditoría contable
    const attachment = await AttachmentModel.findOne({
      where: {
        subscriptionId: input.subscriptionId,
        relatedModule: "FACTURACION",
        relatedRecordId: input.invoiceId,
        fileExtension: "xml" // Aseguramos recuperar el XML firmado y no el CDR .zip
      }
    });

    if (!attachment || !attachment.fileUrl) {
      throw new Error(`El archivo físico firmado XML aún no ha sido persistido o resguardado en la nube.`);
    }

    console.log(`📡 [DOWNLOAD-SERVICE] Recuperando XML desde R2: [${attachment.fileUrl}]`);

    try {
      // 3. DESCARGA EL FLUJO VOLÁTIL DE BYTES DESDE CLOUDFLARE R2 A LA MEMORIA RAM
      const r2Response = await axios.get(attachment.fileUrl, {
        responseType: "arraybuffer" // Captura binaria exacta sin romper codificaciones UTF-8
      });

      const fileBuffer = Buffer.from(r2Response.data);

      return {
        fileBuffer: fileBuffer,
        fileName: attachment.fileName, // Mantiene el nombre real indexado (Ej: "20100066603-BOLETA-B002-1.xml")
        mimeType: attachment.mimeType  // "text/xml"
      };

    } catch (r2Error: any) {
      console.error(`🚨 Error al descargar el archivo desde el bucket de Cloudflare R2:`, r2Error.message);
      throw new Error(`No se pudo extraer el comprobante desde el almacenamiento en la nube: ${r2Error.message}`);
    }
  }
}