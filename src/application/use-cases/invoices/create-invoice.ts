// =========================================================================
// 🚀 USE CASE MAESTRO DE EMISIÓN INTEGRADO A SUNAT UBL 2.1 (BLOQUE 1 DE 3)
// =========================================================================
import { sequelizeInstance } from "../../../infrastructure/database/sequelize.config";
import { InvoiceHeaderModel } from "../../../infrastructure/database/models/invoice-header.model";
import { InvoiceDetailModel } from "../../../infrastructure/database/models/invoice-detail.model";
import { DocumentSeriesModel } from "../../../infrastructure/database/models/document-series.model";
import { ProductModel } from "../../../infrastructure/database/models/product.model";
import { ProductKardexModel } from "../../../infrastructure/database/models/product-kardex.model";
import { AuxiliaryParameterModel } from "../../../infrastructure/database/models/auxiliary-parameter.model";
import { SunatOrchestratorService } from "../../../infrastructure/services/sunat-orchestrator.service";
import { SunatSignerService } from "../../../infrastructure/services/sunat-signer.service";
import { SunatSoapService } from "../../../infrastructure/services/sunat-soap.service";

export interface InvoiceDetailInput {
  productId: number;
  productCode: string;
  productName: string;
  unitMeasureCode: string;
  quantity: number;
  unitPrice: number; // Precio con IGV incluido
  taxTypeCode: string; // '10' (Gravado), '20' (Exonerado), etc.
}

export interface CreateInvoiceInput {
  subscriptionId: number;
  companyId: number;
  branchId: number;
  userId: number;
  seriesId: number; // ID de la serie o talonario seleccionado
  dueDate?: string | null;
  customerId: number;
  customerIdentityType: string;
  customerIdentityNumber: string;
  customerName: string;
  customerAddress?: string | null;
  currencyCode: string;
  exchangeRate: number;
  totalLetras: string;
  details: InvoiceDetailInput[];
}

export class CreateInvoiceUseCase {
  // private signerService = new SunatSignerService();
  // private soapService = new SunatSoapService();
  private sunatOrchestratorService = new SunatOrchestratorService(
    new SunatSignerService(),
    new SunatSoapService(),
  );

  async execute(data: CreateInvoiceInput) {
    // 🚀 INICIALIZAMOS LA TRANSACCIÓN ÁCIDA GLOBAL
    const transaction = await sequelizeInstance.transaction();

    try {
      // 1. 🔒 BLOQUEO ATÓMICO ANTI-COLISIONES: Bloqueamos el talonario para este hilo
      const seriesRow = await DocumentSeriesModel.findOne({
        where: {
          id: data.seriesId,
          subscriptionId: data.subscriptionId,
          companyId: data.companyId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE, // Evita colisiones de lectura en paralelo
      });

      if (!seriesRow || !seriesRow.isActive) {
        throw new Error(
          "El talonario de series seleccionado no es válido o fue dado de baja.",
        );
      }

      // Detectamos el tipo de documento que se está emitiendo en la cabecera
      const docType = String(seriesRow.documentType).trim().toUpperCase();

      // 🌟 REGLA DE AUDITORÍA CONTABLE: Solo descuentan stock los comprobantes de pago reales
      const shouldAffectInventory =
        docType === "FACTURA" || docType === "BOLETA";

      console.log(
        `📡 [RADAR INVENTARIOS] Emitiendo: [${docType}] | ¿Afecta Kardex y Almacén?: [${shouldAffectInventory}]`,
      );

      // 2. Calculamos el próximo número correlativo oficial
      const nextNumber = seriesRow.currentNumber + 1;
      const formattedCorrelative = String(nextNumber).padStart(8, "0");
      const fullNumberStr = `${seriesRow.series}-${formattedCorrelative}`;

      // 3. Inicializamos acumuladores globales para la cabecera
      let totalGravada = 0;
      let totalExonerada = 0;
      let totalInafecta = 0;
      let totalGratuita = 0;
      let totalIgv = 0;
      let totalVenta = 0;

      const processedDetails: any[] = [];

      // 4. 🛒 BUCLE DE CÁLCULO CONTABLE + AFECTACIÓN DE INVENTARIOS EN KARDEX (MÉTODO ENTERPRISE)
      for (const item of data.details) {
        const qty = Number(item.quantity);
        const priceWithIgv = Number(item.unitPrice);

        let valueWithoutIgv = priceWithIgv;
        let itemIgv = 0;
        let taxPercentage = 0.0;

        if (item.taxTypeCode === "10") {
          // Operación Gravada Comercial Estándar (18%)
          taxPercentage = 18.0;
          valueWithoutIgv = priceWithIgv / 1.18; // Desglosamos el valor neto
          itemIgv = priceWithIgv - valueWithoutIgv;
        }

        // Totales calculados con precisión por cantidad de ítems
        const subtotalValue = valueWithoutIgv * qty;
        const subtotalIgv = itemIgv * qty;
        const subtotalPrice = priceWithIgv * qty;

        // Acumulación en matrices según catálogo de afectación SUNAT
        if (item.taxTypeCode === "10") {
          totalGravada += subtotalValue;
          totalIgv += subtotalIgv;
          totalVenta += subtotalPrice;
        } else if (item.taxTypeCode === "20") {
          totalExonerada += subtotalValue;
          totalVenta += subtotalPrice;
        } else {
          totalInafecta += subtotalValue;
          totalVenta += subtotalPrice;
        }
        // =========================================================================
        // 📦 MOTOR DE KARDEX: SEGUIMIENTO ULTRA-OPTIMO CON COLUMNA CACHÉ
        // =========================================================================
        // A. Buscamos el producto en la BD bloqueando su fila contra compras concurrentes
        const productRow = await ProductModel.findOne({
          where: { id: item.productId, subscriptionId: data.subscriptionId },
          transaction,
          lock: transaction.LOCK.UPDATE, // Evita colisiones por doble venta simultánea
          include: [
            {
              model: AuxiliaryParameterModel,
              as: "UnitMeasureParameter", // Alias relacional del catálogo paramétrico
              required: false,
              attributes: ["id", "code", "name"],
            },
          ],
        });

        if (!productRow) {
          throw new Error(
            `El producto [${item.productName}] no existe en el catálogo general del holding.`,
          );
        }

        // Leemos de forma ultra veloz la columna caché
        const currentStock = Number(productRow.get("stock") || 0);

        // =========================================================================
        // 🎯 EL DESTRABE ABSOLUTO MÁSTER: LEEMOS LA UNIDAD DIRECTO DE MYSQL (AIVEN)
        // Extraemos el código real ('ZZ' o 'NIU') guardado en la base de datos
        // =========================================================================
        const realUnitCode = String(
          productRow.UnitMeasureParameter?.code || "NIU",
        )
          .toUpperCase()
          .trim();
        const realUnitName = String(
          productRow.UnitMeasureParameter?.name || "UNIDADES",
        )
          .toUpperCase()
          .trim();

        // El cortafuegos se activa si el código de la SUNAT es ZZ o la glosa contiene SERVICIO
        const isServiceItem =
          realUnitCode === "ZZ" || realUnitName.includes("SERVICIO");

        console.log(
          `📦 [POS-UNIT] Evaluando: [${productRow.get("name")}] | Código SUNAT: [${realUnitCode}]`,
        );

        // =========================================================================
        // 🛡️ CONDICIONAL ATÓMICO INVENTORY: Solo resta si es Factura o Boleta
        // =========================================================================
        if (shouldAffectInventory) {
          // 📦 CASO A: SI ES UN BIEN FÍSICO (TANGIBLE), APLICAMOS CONTROL LOGÍSTICO ESTRICTO
          if (!isServiceItem) {
            // Evaluamos disponibilidad en tiempo real
            if (currentStock < qty) {
              throw new Error(
                `Stock insuficiente para [${productRow.get("name")}]. Saldo en almacén: ${currentStock}, Solicitado: ${qty}`,
              );
            }

            const calculatedFinalStock = currentStock - qty;

            // C. RESTA ATÓMICA: Actualizamos la columna caché de saldos en disco de forma instantánea
            await productRow.update(
              { stock: calculatedFinalStock },
              { transaction },
            );

            // D. TRAZABILIDAD: Insertamos el registro inmutable en el Kardex para auditorías
            await ProductKardexModel.create(
              {
                subscriptionId: data.subscriptionId,
                companyId: data.companyId,
                branchId: data.branchId,
                productId: productRow.id,
                movementType: "SALIDA",
                sourceDocument: fullNumberStr, // Amarrado al ticket calculado arriba
                quantity: qty,
                previousStock: currentStock,
                actualStock: calculatedFinalStock,
              },
              { transaction },
            );

            console.log(
              `📦 KARDEX SINCRO - [${productRow.get("name")}] restado con éxito. Nuevo saldo: ${calculatedFinalStock}`,
            );
          } else {
            // ⚡ CASO B: ES UN SERVICIO INTANGIBLE
            // Omitimos la resta de inventarios y el Kárdex en frío, dándole luz verde inmediata
            console.log(
              `✨ [POS LOGÍSTICA] [${productRow.get("name")}] es un SERVICIO (${realUnitCode}). Ignorando control de existencias.`,
            );
          }
        } else {
          console.log(
            `📝 PRE-VENTA AUDIT - [${productRow.get("name")}] cotizado sin alterar existencias físicas.`,
          );
        }

        // Estructuramos el payload contable exacto por cada ítem iterado
        processedDetails.push({
          productId: item.productId,
          productCode: item.productCode,
          productName: productRow.get("name"),
          unitMeasureCode: realUnitCode,
          quantity: qty,

          // 🎯 LAS TRES LLAVES MAESTRAS DE EMISIÓN: Sincronizan de corrido con las firmas del XML
          precioConIgv: priceWithIgv,
          valorSinIgv: valueWithoutIgv,
          igvItem: subtotalIgv,

          taxTypeCode: item.taxTypeCode,
          taxPercentage: taxPercentage,
          subtotalValue: subtotalValue,
          subtotalIgv: subtotalIgv,
          subtotalPrice: subtotalPrice,
          nombre: productRow.get("name"), // Clave requerida en el template
        });
      }

      // =========================================================================
      // 5. Captura de marca de tiempo en la zona horaria del servidor
      // =========================================================================
      const now = new Date();
      const localDate = now.toISOString().split("T")[0];
      const localTime = now.toTimeString().split(" ")[0];

      // =========================================================================
      // 6. 💾 GUARDAR CABECERA DENTRO DE LA TRANSACCIÓN
      // =========================================================================
      const headerRow = await InvoiceHeaderModel.create(
        {
          subscriptionId: data.subscriptionId,
          companyId: data.companyId,
          branchId: data.branchId,
          userId: data.userId,
          documentType: seriesRow.documentType,
          series: seriesRow.series,
          correlative: formattedCorrelative,
          fullDocumentNumber: fullNumberStr,
          issueDate: localDate,
          issueTime: localTime,
          dueDate: data.dueDate || null,
          customerId: data.customerId,
          customerIdentityType: data.customerIdentityType,
          customerIdentityNumber: data.customerIdentityNumber,
          customerName: data.customerName,
          customerAddress: data.customerAddress || null,
          currencyCode: data.currencyCode,
          exchangeRate: Number(data.exchangeRate),
          totalGravada,
          totalExonerada,
          totalInafecta,
          totalGratuita,
          totalIgv,
          totalIsc: 0,
          totalOtrosCargos: 0,
          totalVenta,
          totalLetras: data.totalLetras.toUpperCase(),
          paymentStatus: "PENDIENTE",
          sunatStatus: "PENDIENTE",
        },
        { transaction },
      );
      // =========================================================================
      // 7. 💾 GUARDAR DETALLES EN BLOQUE VINCULADOS A LA CABECERA
      // =========================================================================
      const detailsRowsPayload = processedDetails.map((d: any) => ({
        invoiceHeaderId: headerRow.id,
        productId: d.productId,
        productCode: d.productCode,
        productName: d.productName,
        unitMeasureCode: d.unitMeasureCode,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        unitValue: d.unitValue,
        taxTypeCode: d.taxTypeCode,
        taxPercentage: d.taxPercentage,
        subtotalValue: d.subtotalValue,
        subtotalIgv: d.subtotalIgv,
        subtotalPrice: d.subtotalPrice,
      }));

      // Inserción masiva limpia en bloque de alto rendimiento
      await InvoiceDetailModel.bulkCreate(detailsRowsPayload, { transaction });

      // =========================================================================
      // 11. 🎯 ACTUALIZAMOS EL CONTADOR DEL TALONARIO EN DISCO
      // =========================================================================
      await seriesRow.update({ currentNumber: nextNumber }, { transaction });

      // 🔥 INVOCACIÓN CENTRALIZADA: Un solo comando hace toda la magia
      const sunatResult = await this.sunatOrchestratorService.processAndSend(headerRow, transaction);

      // 🏁 CONSOLIDACIÓN INDESTRUCTIBLE EN MYSQL (AIVEN)
      await transaction.commit();


      console.log(
        `🏆 [TRANSACCIÓN EXITOSA] Comprobante ${fullNumberStr} procesado e indexado.`,
      );

      return {
        id: headerRow.id,
        fullDocumentNumber: fullNumberStr,
        totalVenta: totalVenta,
        sunat: {
          success: sunatResult.success,
          code: sunatResult.sunatResponseCode,
          message: sunatResult.sunatDescription,
          hash: sunatResult.digestValue,
        },
      };
    } catch (error) {
      // 💥 REBOTE AUTOMÁTICO ACID: Si algo falló, se deshace todo rastro logístico y contable
      await transaction.rollback();
      console.error(
        "🚨 [CRASH TRANSACCIONAL INVOICE]: Rollback ejecutado en disco.",
        error,
      );
      throw error;
    }
  }
}
