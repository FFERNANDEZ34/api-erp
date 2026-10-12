import { InvoiceHeaderModel } from "../../../infrastructure/database/models/invoice-header.model";
import { InvoiceDetailModel } from "../../../infrastructure/database/models/invoice-detail.model";

export interface GetInvoiceByIdInput {
  invoiceId: number;
}

export class GetInvoiceByIdUseCase {
  /**
   * 🔍 RECUPERACIÓN CORPORATIVA: Captura el comprobante junto con su matriz de artículos
   */
  public async execute(input: GetInvoiceByIdInput): Promise<InvoiceHeaderModel> {
    const invoice = await InvoiceHeaderModel.findByPk(input.invoiceId, {
      include: [
        {
          model: InvoiceDetailModel,
          as: "Details", // Mantiene el alias exacto configurado en tu InvoiceDetailModel.init
          required: false
        }
      ]
    });

    if (!invoice) {
      throw new Error(`El comprobante con ID [${input.invoiceId}] no se encuentra indexado en el holding.`);
    }

    return invoice;
  }
}