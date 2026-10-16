import jwt from "jsonwebtoken";
import axios from "axios";
import https from "https";
import { InvoiceHeaderModel } from "../database/models/invoice-header.model";
import { InvoiceDetailModel } from "../database/models/invoice-detail.model";
import { CompanyModel } from "../database/models/company.model";
import { AttachmentModel } from "../database/models/attachment.model";
import { UploadAttachmentUseCase } from "../../application/use-cases/attachments/upload-attachment";

interface EmisorSaasDto {
  ruc: string;
  razonSocial: string;
  ubigeo: string;
  direccion: string;
  certificadoUrl: string;
  certificadoClave: string;
  sunatUsuario: string;
  sunatClave: string;
}

export class SunatOrchestratorService {
  private readonly uploadAttachmentUseCase: UploadAttachmentUseCase;
  constructor() {
    // Instanciamos el caso de uso para tenerlo disponible de forma interna
    this.uploadAttachmentUseCase = new UploadAttachmentUseCase();
  }

  public async sendToNetCoreProcessor(
    headerId: number,
    emisorCreds: EmisorSaasDto,
    formaPago: "Contado" | "Crédito" = "Contado",
  ): Promise<any> {
    const invoice = await InvoiceHeaderModel.findByPk(headerId, {
      include: [{ model: InvoiceDetailModel, as: "Details" }],
    });

    console.log(
      "***************Entró a sendToNetCoreProcessor****************",
    );

    if (!invoice)
      throw new Error(`No se encontró la factura con el ID local: ${headerId}`);
    const details = ((invoice as any).Details as InvoiceDetailModel[]) || [];

    // Mapeo al formato estricto de .NET 9
    const netCorePayload = {
      serie: invoice.series,
      correlativo: Number(invoice.correlative),
      tipoComprobante: invoice.documentType === "FACTURA" ? "01" : "03",
      fechaEmision: `${invoice.issueDate}T${invoice.issueTime}Z`,
      moneda: invoice.currencyCode,
      formaPago: formaPago,
      emisor: {
        ruc: emisorCreds.ruc,
        razonSocial: emisorCreds.razonSocial,
        ubigeo: emisorCreds.ubigeo,
        direccion: emisorCreds.direccion,
        certificadoUrl: emisorCreds.certificadoUrl,
        certificadoClave: emisorCreds.certificadoClave,
        sunatUsuario: emisorCreds.sunatUsuario,
        sunatClave: emisorCreds.sunatClave,
      },
      receptor: {
        tipoDocumento: invoice.customerIdentityType,
        numeroDocumento: invoice.customerIdentityNumber,
        razonSocial: invoice.customerName,
      },
      totalGravado: Number(invoice.totalGravada),
      totalIgv: Number(invoice.totalIgv),
      totalPagar: Number(invoice.totalVenta),
      lineas: details.map((linea, index) => ({
        id: index + 1,
        cantidad: Number(linea.quantity),
        unidadMedida: linea.unitMeasureCode,
        descripcion: linea.productName,
        valorUnitario: Number(linea.unitValue),
        precioUnitario: Number(linea.unitPrice),
        igv: Number(linea.subtotalIgv),
        totalLinea: Number(linea.subtotalValue),
        tipoAfectacion: linea.taxTypeCode,
      })),
    };

    console.log("Datos enviados al Net 9:", JSON.stringify(netCorePayload));
    console.log("Url_Microservice",process.env.SUNAT_BILLING_URL);
    const MICROSERVICE_URL =
      process.env.SUNAT_BILLING_URL ||
      "https://localhost:7265/api/v1/billing/invoice";
    const JWT_SECRET =
      process.env.JWT_SECRET_KEY || "TuSuperClaveSecretaInmutableDe32Bytes!";

    // 🎯 2. Crear un agente HTTPS que permita certificados auto-firmados en Localhost

    const token = jwt.sign(
      { sub: emisorCreds.ruc, role: "BillingClient" },
      JWT_SECRET,
      {
        issuer: "BillingServiceEmisor",
        audience: "BillingServiceClientes",
        expiresIn: "2m",
      },
    );

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    console.log(">>>>Enviar a Microservicio: >>>");
    const response = await axios.post(MICROSERVICE_URL, netCorePayload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      httpsAgent: httpsAgent,
    });

    return response.data;
  }

  /**
   * 💵 🔄 MÉTODO ENGRANADO CON TUS CASOS DE USO (Payments y Retry)
   * Recibe únicamente el modelo de factura, jala el contexto de la base de datos
   * y llama internamente al procesador de .NET 9.
   */
  public async processAndSend(invoice: InvoiceHeaderModel): Promise<any> {
    // 1. Buscamos los datos duros de la compañía dueña de la factura (Multi-tenant)

    const company = await CompanyModel.findOne({
      where: { id: invoice.companyId },
      include: [{ model: AttachmentModel, as: "CompanyFiles" }],
    });

    if (!company) {
      throw new Error("Compañía emisora no registrada en el sistema.");
    }

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

      if (!finalCertToDownload) {
        throw new Error(
          "Certificado digital (.pfx) ausente en el holding relacional.",
        );
      }

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
          `☁ [CLOUDFLARE R2] Obteniendo url de certificado criptográfico en caliente... URL: ${finalCertToDownload.fileUrl}`,
        );
      }
      // 3. Estructuramos el DTO del emisor dinámico
      const emisorCreds: EmisorSaasDto = {
        ruc: company.ruc,
        razonSocial: company.name,
        ubigeo: company.ubigeo as any,
        direccion: company.address as any,
        certificadoUrl: finalCertToDownload?.fileUrl,
        certificadoClave: company.certificatePassword as any,
        sunatUsuario: company.sunatUser,
        sunatClave: company.sunatPassword,
      };

      console.log("Datos Emisor:", JSON.stringify(emisorCreds));
      // 4. 🔥 REUTILIZACIÓN ABSOLUTA: Llamamos a tu método existente pasándole el ID de la factura
      console.log(
        `[ORQUESTADOR] Resolviendo contexto SaaS para factura ${invoice.series}-${invoice.correlative}`,
      );
      const resultNet = await this.sendToNetCoreProcessor(
        invoice.id,
        emisorCreds,
        "Contado",
      );

      // 5. 💾 PERSISTENCIA AUTOMÁTICA EN MYSQL
      // El orquestador asume el timbrado físico de las columnas en tu base de datos de Sequelize
      await invoice.update({
        sunatStatus: resultNet.success ? "ACEPTADO" : "RECHAZADO",
        sunatResponseCode: resultNet.sunatResponseCode,
        sunatDescription: resultNet.message,
      });

      // =========================================================================
      // 🎯 AUTO-GUARDADO DE ADJUNTOS EN TU TABLA INTERMEDIA (REUTILIZACIÓN TOTAL)
      // Si la SUNAT aceptó y .NET logró subir los archivos a R2, los indexamos en tu DB
      // =========================================================================
      if (resultNet.success) {
        const nombreBaseArchivo = `${company.ruc}-${invoice.documentType}-${invoice.series}-${Number(invoice.correlative)}`;

        // 1. Guardar el XML firmado (Si la URL no viene vacía por contingencia)
        if (resultNet.xmlUrl) {
          try {
            await this.uploadAttachmentUseCase.execute({
              subscriptionId: invoice.subscriptionId,
              relatedModule: "FACTURACION",
              relatedRecordId: invoice.id,
              fileName: `${nombreBaseArchivo}.xml`,
              fileUrl: resultNet.xmlUrl,
              mimeType: "text/xml",
              fileSize: 4096, // Tamaño estimado base en bytes para auditorías fijas
            });
            console.log(
              `💾 [ATTACHMENT] Enlace del XML firmado indexado en base de datos local.`,
            );
          } catch (attErr: any) {
            console.error(
              `[ADVERTENCIA] No se pudo registrar el adjunto XML: ${attErr.message}`,
            );
          }
        }

        // 2. Guardar la Constancia de Recepción (CDR ZIP)
        if (resultNet.cdrUrl) {
          try {
            await this.uploadAttachmentUseCase.execute({
              subscriptionId: invoice.subscriptionId,
              relatedModule: "FACTURACION",
              relatedRecordId: invoice.id,
              fileName: `R-${nombreBaseArchivo}.zip`,
              fileUrl: resultNet.cdrUrl,
              mimeType: "application/zip",
              fileSize: 2048, // Tamaño estimado base en bytes
            });
            console.log(
              `💾 [ATTACHMENT] Enlace del CDR ZIP indexado en base de datos local.`,
            );
          } catch (attErr: any) {
            console.error(
              `[ADVERTENCIA] No se pudo registrar el adjunto CDR: ${attErr.message}`,
            );
          }
        }
      }

      // Devolvemos el formato exacto que tus casos de uso esperan leer en sus condicionales
      return {
        success: resultNet.success,
        sunatStatus: resultNet.success ? "ACEPTADO" : "RECHAZADO",
        sunatDescription: resultNet.message,
        xmlUrl: resultNet.xmlUrl || "",
        cdrUrl: resultNet.cdrUrl || "",
        observations: resultNet.observations || [],
      };
    }
  }
}
