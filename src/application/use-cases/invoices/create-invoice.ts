import { sequelizeInstance } from "../../../infrastructure/database/sequelize.config";
import { InvoiceHeaderModel } from "../../../infrastructure/database/models/invoice-header.model";
import { InvoiceDetailModel } from "../../../infrastructure/database/models/invoice-detail.model";
import { DocumentSeriesModel } from "../../../infrastructure/database/models/document-series.model";
import { ProductModel } from "../../../infrastructure/database/models/product.model"; // 🚀 Sincronizado
import { ProductKardexModel } from "../../../infrastructure/database/models/product-kardex.model"; // 🚀 Sincronizado

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
  async execute(data: CreateInvoiceInput) {
    // 🚀 INICIALIZAMOS LA TRANSACCIÓN ACIDA GLOBAL
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
        lock: transaction.LOCK.UPDATE, // Evita que otro cajero lea este mismo correlativo en paralelo
      });

      if (!seriesRow || !seriesRow.isActive) {
        throw new Error(
          "El talonario de series seleccionado no es válido o fue dado de baja.",
        );
      }

      //********************************************************** */
      // Detectamos el tipo de documento que se está emitiendo en la cabecera
      // Asume que tu objeto 'data.documentType' o 'seriesRow.documentType' guarda 'FACTURA', 'BOLETA' o 'NOTA_PEDIDO'
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
        });

        if (!productRow) {
          throw new Error(
            `El producto [${item.productName}] no existe en el catálogo general del holding.`,
          );
        }

        // Leemos de forma ultra veloz la columna caché
        const currentStock = Number(productRow.get("stock") || 0);

        // =========================================================================
        // 🛡️ CONDICIONAL ATÓMICO INVENTORY: Solo resta si es Factura o Boleta
        // =========================================================================
        if (shouldAffectInventory) {
          // B. Condicional Logístico: Evaluamos disponibilidad solo si es un Bien físico (NIU)
          if (item.unitMeasureCode === "NIU" && currentStock < qty) {
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
              sourceDocument: fullNumberStr, // Queda amarrado al ticket calculado arriba: 'B001-00000002'
              quantity: qty,
              previousStock: currentStock,
              actualStock: calculatedFinalStock,
            },
            { transaction },
          );
          // =========================================================================
          console.log(
            `📦 KARDEX SINCRO - [${productRow.name}] restado con éxito. Nuevo saldo: ${calculatedFinalStock}`,
          );
        } else {
          console.log(
            `📝 PRE-VENTA AUDIT - [${productRow.name}] cotizado sin alterar existencias físicas.`,
          );
        }

        processedDetails.push({
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unitMeasureCode: item.unitMeasureCode,
          quantity: qty,
          unitPrice: priceWithIgv,
          unitValue: valueWithoutIgv,
          taxTypeCode: item.taxTypeCode,
          taxPercentage: taxPercentage,
          subtotalValue: subtotalValue,
          subtotalIgv: subtotalIgv,
          subtotalPrice: subtotalPrice,
        });
      }
      // =========================================================================
      // 5. Captura de marca de tiempo en la zona horaria del servidor
      // =========================================================================
      const now = new Date();
      // Capturamos las cadenas de texto limpias evitando arreglos volátiles
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
      // 8. 🎯 ACTUALIZAMOS EL CONTADOR DEL TALONARIO EN DISCO
      // =========================================================================
      await seriesRow.update({ currentNumber: nextNumber }, { transaction });

      // 🏁 SI TODO MARCHÓ EN VERDE, CONSOLIDAMOS LOS DATOS EN MYSQL
      await transaction.commit();

      return {
        id: headerRow.id,
        fullDocumentNumber: fullNumberStr,
        totalVenta: totalVenta,
      };
    } catch (error) {
      // 💥 REBOTE AUTOMÁTICO: Si algo falló, se deshace todo rastro en la RAM del servidor
      await transaction.rollback();
      throw error;
    }
  }
}
