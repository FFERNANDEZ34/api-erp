import { InvoiceHeaderModel } from "../../../infrastructure/database/models/invoice-header.model";
import { InvoiceDetailModel } from "../../../infrastructure/database/models/invoice-detail.model";
import { CompanyModel } from "../../../infrastructure/database/models/company.model";

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
     // 🎯 EL DESTRABE DE CABECERA: Buscamos los datos maestros de la compañía emisora por su PK
    const company = await CompanyModel.findByPk(invoice.companyId);
    
    // Convertimos a JSON plano para extender las propiedades de forma dinámica en la RAM
    const invoiceJson = invoice.toJSON();

    if (company) {
      // Inyectamos las propiedades fiscales del emisor directamente en la raíz para consumo del ticket
      invoiceJson.companyName = company.name;
      invoiceJson.companyCommercialName = company.commercialName || company.name;
      invoiceJson.companyRuc = company.ruc;
      invoiceJson.companyAddress = company.address || "Lima, Peru";
      invoiceJson.companyUbigeo = company.ubigeo || "150101";
      invoiceJson.companyPhone = company.phone || null;
      invoiceJson.companyEmail = company.email || null;
    } else {
      // Fallback de contingencia industrial por si el registro huérfano pierde asociación
      invoiceJson.companyName = "EMPRESA EMISORA POS";
      invoiceJson.companyCommercialName = "EMPRESA EMISORA POS";
      invoiceJson.companyRuc = "99999999999";
      invoiceJson.companyAddress = "Dirección Fiscal No Registrada";
      invoiceJson.companyUbigeo = "150101";
    }


    console.log(invoiceJson)

    return invoiceJson;
  }
}