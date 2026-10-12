import { InvoiceHeaderModel } from "../../../infrastructure/database/models/invoice-header.model";
import * as path from "path";
import * as fs from "fs";

export interface DownloadXmlInput {
  invoiceId: number;
}

export interface DownloadXmlOutput {
  absoluteFilePath: string;
  documentNumber: string;
}

export class DownloadXmlUseCase {
  public async execute(input: DownloadXmlInput): Promise<DownloadXmlOutput> {
    const invoice = await InvoiceHeaderModel.findByPk(input.invoiceId);
    if (!invoice) throw new Error("Comprobante no indexado en base de datos.");

    // Mapeamos la ruta física exacta contra la carpeta local de la RAM configurada
    const storageDir = path.join(process.cwd(), "storage", "invoices_xml");
    const fileName = `${invoice.fullDocumentNumber}.xml`; // O el formato de nombre exacto que uses
    const absolutePath = path.join(storageDir, fileName);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`El archivo físico firmado XML aún no ha sido persistido en el servidor.`);
    }

    return {
      absoluteFilePath: absolutePath,
      documentNumber: invoice.fullDocumentNumber
    };
  }
}