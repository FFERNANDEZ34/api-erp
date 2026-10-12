import { InvoiceHeaderModel } from "../database/models/invoice-header.model";
import { InvoiceDetailModel } from "../database/models/invoice-detail.model";
import { CompanyModel } from "../database/models/company.model";
import { AttachmentModel } from "../database/models/attachment.model";
import { ProductModel } from "../database/models/product.model";
import { AuxiliaryParameterModel } from "../database/models/auxiliary-parameter.model";
import { SunatSignerService } from "./sunat-signer.service";
import { SunatSoapService } from "./sunat-soap.service";
import { generateInvoiceXmlTemplate } from "../templates/invoice-xml.template";
import * as path from "path";
import * as fs from "fs";

export interface OrchestratorResult {
  success: boolean;
  sunatStatus: string;
  sunatResponseCode: string | null;
  sunatDescription: string | null;
  digestValue: string | null;
}

export class SunatOrchestratorService {
  constructor(
    private readonly sunatSignerService: SunatSignerService,
    private readonly sunatSoapService: SunatSoapService,
  ) {}

  /**
   * 🔥 PUNTO ÚNICO DE CONTACTO FISCAL CENTRALIZADO (Create & Retry)
   */
  public async processAndSend(
    invoice: InvoiceHeaderModel,
    sequelizeTransaction?: any,
  ): Promise<OrchestratorResult> {
    // 1. Recuperamos los detalles y la compañía emisora con sus adjuntos polimórficos desde MySQL
    const dbDetails = await InvoiceDetailModel.findAll({
      where: { invoiceHeaderId: invoice.id },
    });

    const company = await CompanyModel.findOne({
      where: { id: invoice.companyId },
      include: [{ model: AttachmentModel, as: "CompanyFiles" }],
    });

    if (!company)
      throw new Error("Compañía emisora no registrada en el sistema.");

    let certificateBuffer: Buffer | null = null;
    let digestValue: string | null = null;

    // 🛡️ CORTAFUEGOS DEFENSIVO: Validamos si la empresa cuenta con credenciales SOL configuradas
    if (company.sunatUser && company.sunatPassword) {
      const certFiles = company.CompanyFiles || [];

      // 🎯 IDENTIFICACIÓN DE CERTIFICADO: Buscamos el marcado como principal o tomamos el último
    //   const mainCertFile =
    //     certFiles.find((f: any) => f.isMainPhoto) ||
    //     certFiles[certFiles.length - 1];
      const mainCertFile =
        certFiles.find((f: any) => {
          const isCompanyModule = f.relatedModule === "COMPANIAS";
          const fileUrlStr = String(f.fileUrl || "").toLowerCase();
          const fileKeyStr = String(f.fileKey || "").toLowerCase();
          const fileNameStr = String(f.fileName || "").toLowerCase();

          // El archivo debe pertenecer a la empresa y obligatoriamente terminar o contener '.pfx'
          return (
            isCompanyModule &&
            (fileUrlStr.endsWith(".pfx") ||
              fileKeyStr.endsWith(".pfx") ||
              fileNameStr.endsWith(".pfx") ||
              f.isMainPhoto === false) // O la bandera lógica con la que diferencies el certificado del logo
          );
        }) ||
        certFiles.find((f: any) =>
          String(f.fileUrl || "")
            .toLowerCase()
            .includes(".pfx"),
        ); // Fallback de emergencia

      const finalCertToDownload =
        mainCertFile || certFiles[certFiles.length - 1];

      if (!finalCertToDownload)
        throw new Error(
          "Certificado digital (.pfx) ausente en el holding relacional.",
        );

      // Validamos preventivamente que no se nos cuele un JPG en la tubería criptográfica
      if (
        String(finalCertToDownload.fileUrl)
          .toLowerCase()
          .match(/\.(jpg|jpeg|png)$/)
      ) {
        throw new Error(
          "🚨 [CORTAFUEGOS POS] Se intentó descargar una imagen de logo en lugar del certificado .pfx. Verifica los registros en la base de datos.",
        );
      }

      if (finalCertToDownload?.fileUrl) {
        console.log(
          `☁ [CLOUDFLARE R2] Descargando certificado criptográfico en caliente... URL: ${finalCertToDownload.fileUrl}`,
        );
        const axios = require("axios");
        const certificateResponse = await axios.get(finalCertToDownload.fileUrl, {
          responseType: "arraybuffer",
          timeout: 8000,
        });
        if (certificateResponse.data) {
          certificateBuffer = Buffer.from(certificateResponse.data);
          console.log(
            `⚡ [CLOUDFLARE R2] Certificado digital recuperado con éxito en la RAM (${certificateBuffer.length} bytes).`,
          );
        }
      } else {
        // Opción B: Cortafuegos de testeo físico local en el servidor de desarrollo (Fase de Pruebas Local)
        const localTestCertPath = path.join(
          process.cwd(),
          "certs",
          `${company.ruc}.pfx`,
        );
        if (fs.existsSync(localTestCertPath)) {
          certificateBuffer = fs.readFileSync(localTestCertPath);
          console.log(
            `📂 [LOCAL CERT] Usando certificado de pruebas local desde: ${localTestCertPath}`,
          );
        }
      }

      if (!certificateBuffer) {
        throw new Error(
          `Falta el archivo binario del certificado digital (.pfx) en el búnker para el RUC ${company.ruc}`,
        );
      }

      // 2. Reconstrucción del arreglo de ítems consultando catálogos del holding general
      const processedDetails: any[] = [];
      for (const item of dbDetails) {
        const qty = Number(item.quantity);
        const priceWithIgv = Number(item.unitPrice);

        let valueWithoutIgv = priceWithIgv;
        let itemIgv = 0;
        let taxPercentage = 0.0;

        if (item.taxTypeCode === "10") {
          taxPercentage = 18.0;
          valueWithoutIgv = priceWithIgv / 1.18;
          itemIgv = priceWithIgv - valueWithoutIgv;
        }

        const productRow = await ProductModel.findOne({
          where: { id: item.productId, subscriptionId: invoice.subscriptionId },
          include: [
            {
              model: AuxiliaryParameterModel,
              as: "UnitMeasureParameter",
              required: false,
            },
          ],
        });

        if (!productRow)
          throw new Error(
            `El producto [${item.productName}] no existe en el catálogo general.`,
          );
        const realUnitCode = String(
          productRow.UnitMeasureParameter?.code || "NIU",
        )
          .toUpperCase()
          .trim();

        processedDetails.push({
          productId: item.productId,
          productCode: item.productCode,
          productName: productRow.get("name"),
          unitMeasureCode: realUnitCode,
          quantity: qty,
          precioConIgv: priceWithIgv,
          valorSinIgv: valueWithoutIgv,
          igvItem: itemIgv * qty,
          taxTypeCode: item.taxTypeCode,
          taxPercentage,
          subtotalValue: valueWithoutIgv * qty,
          subtotalIgv: itemIgv * qty,
          subtotalPrice: priceWithIgv * qty,
          nombre: productRow.get("name"),
        });
      }

      // 3. Compilación del XML UBL 2.1 base a través de tu template centralizado
      const xmlRawString = generateInvoiceXmlTemplate({
        rucEmisor: company.ruc,
        tipoComprobante: invoice.documentType === "FACTURA" ? "01" : "03",
        serieComprobante: invoice.series,
        correlativoComprobante: invoice.correlative,
        fechaEmision: invoice.issueDate,
        horaEmision: invoice.issueTime,
        moneda: invoice.currencyCode,
        razonSocialEmisor: company.name,
        nombreComercialEmisor: company.commercialName || company.name,
        direccionEmisor: company.address || "Lima, Peru",
        ubigeoEmisor: company.ubigeo || "150101",
        tipoDocCliente: invoice.customerIdentityType,
        nroDocCliente: invoice.customerIdentityNumber,
        razonSocialCliente: invoice.customerName,
        totalGravada: Number(invoice.totalGravada),
        totalIgv: Number(invoice.totalIgv),
        totalVenta: Number(invoice.totalVenta),
        totalLetras: invoice.totalLetras.toUpperCase(),
        items: processedDetails,
      });

      // 4. Firmado Criptográfico v6 Nativo Parcheado (Inmune a cvc-complex-type 3)
      const signedXmlResult = await this.sunatSignerService.signInvoice({
        xmlString: xmlRawString,
        certificateBuffer,
        certificatePassword: company.certificatePassword || "MODDATOS",
        rucEmisor: company.ruc,
      });

      digestValue = signedXmlResult.digestValue;

      // =========================================================================
      // 🎛️ EVALUACIÓN CONDICIONAL DEL FLAG DE ENTORNO
      // =========================================================================
      const envValue = String(process.env.ENVIAR_A_SUNAT || '').trim().replace(/['"]/g, '');
      const switchEnviarASunat = envValue === "true" || envValue === "1";
      

      let nextStatus = "PENDIENTE";
      let nextResponseCode: string | null = "OFFLINE";
      let nextDescription: string | null =
        "Envío diferido por Flag inactivo. Comprobante guardado localmente como PENDIENTE.";

      if (switchEnviarASunat) {
        // 5. DISPARO SOAP DIRECTO A LOS SERVIDORES DE SUNAT
        const soapResponse = await this.sunatSoapService.sendInvoiceToSunat({
          xmlString: signedXmlResult.signedXml,
          rucEmisor: company.ruc,
          tipoComprobante: invoice.documentType === "FACTURA" ? "01" : "03",
          serie: invoice.series,
          correlativo: invoice.correlative,
          sunatUserSol: company.sunatUser || "MODDATOS",
          sunatPasswordSol: company.sunatPassword || "MODDATOS",
        });

        // Mapeamos los estados exactos según las reglas originales de tu negocio
        nextStatus = soapResponse.success
          ? "ACEPTADO"
          : soapResponse.sunatResponseCode === "HTTP_ERROR"
            ? "RECHAZADO_RED"
            : "RECHAZADO_SUNAT";

        nextResponseCode = soapResponse.sunatResponseCode;
        nextDescription = soapResponse.sunatDescription;
      } else {
        console.log(
          `⚠️ [ORQUESTADOR CENTRAL] Envío omitido por Flag apagado. Registrado como PENDIENTE.`,
        );
      }

      // 6. ACTUALIZACIÓN TRANSMISIBLE EN MYSQL (AIVEN) VÍA SEQUELIZE
      // Soportamos de forma opcional pasar la transacción de Sequelize abierta del Use Case para evitar Deadlocks
      const updateOptions = sequelizeTransaction
        ? { transaction: sequelizeTransaction }
        : {};

      await invoice.update(
        {
          digestValue: digestValue,
          sunatStatus: nextStatus,
          sunatResponseCode: nextResponseCode,
          sunatDescription: nextDescription,
        },
        updateOptions,
      );

      return {
        success: nextStatus === "ACEPTADO",
        sunatStatus: nextStatus,
        sunatResponseCode: nextResponseCode,
        sunatDescription: nextDescription,
        digestValue,
      };
    } else {
      // Si la empresa no tiene credenciales SOL cargadas, se queda local por defecto
      return {
        success: false,
        sunatStatus: "PENDIENTE",
        sunatResponseCode: "OFFLINE",
        sunatDescription:
          "Comprobante guardado de manera local (Sin credenciales SOL configuradas).",
        digestValue: null,
      };
    }
  }
}
