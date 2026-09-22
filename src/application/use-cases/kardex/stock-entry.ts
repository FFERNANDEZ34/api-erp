import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { ProductModel } from '../../../infrastructure/database/models/product.model';
import { ProductKardexModel } from '../../../infrastructure/database/models/product-kardex.model';

export interface StockEntryItemInput {
  productId: number;
  quantity: number;
  purchasePrice?: number; // Opcional, por si deseas actualizar costos en caliente
}

export interface StockEntryInput {
  subscriptionId: number;
  companyId: number;
  branchId: number; // 📍 Almacén físico donde ingresa la mercadería
  userId: number;   // Operador logístico logueado
  sourceDocument: string; // Ej: 'F002-00004523' (Factura de Proveedor) o 'NI-000001'
  reason: string;         // Ej: 'COMPRA', 'DEVOLUCIÓN', 'AJUSTE_INVENTARIO'
  items: StockEntryItemInput[];
}

export class StockEntryUseCase {
  async execute(data: StockEntryInput) {
    console.log(`=============== 📦 MOTOR LOGÍSTICO: INGRESO ATÓMICO DE STOCK ===============`);
    console.log(`Documento Sustento: [${data.sourceDocument}] | Almacén Destino: [ALM-${data.branchId}]`);

    if (!data.items || data.items.length === 0) {
      throw new Error('Debe incluir al menos un artículo para procesar el ingreso a almacén.');
    }

    // 🚀 INICIALIZAMOS LA TRANSACCIÓN ACID GLOBAL
    const transaction = await sequelizeInstance.transaction();

    try {
      const processedLogs: string[] = [];

      // 🛒 BUCLE DE INCREMENTO DE EXISTENCIAS + ESTAMPADO DE KARDEX
      for (const item of data.items) {
        const qtyToIngress = Number(item.quantity);
        if (qtyToIngress <= 0) {
          throw new Error(`La cantidad a ingresar para el Producto ID [${item.productId}] debe ser mayor a cero.`);
        }

        // A. Buscamos y BLOQUEAMOS la fila del producto en disco contra ventas concurrentes
        const productRow = await ProductModel.findOne({
          where: { id: item.productId, subscriptionId: data.subscriptionId },
          transaction,
          lock: transaction.LOCK.UPDATE // Evita colisiones de lectura si alguien está vendiendo en ese segundo
        });

        if (!productRow) {
          throw new Error(`El producto con ID [${item.productId}] no existe en el catálogo general del holding.`);
        }

        const currentStock = Number(productRow.stock || 0);
        const calculatedFinalStock = currentStock + qtyToIngress; // 🎯 MULTIPLICACIÓN MATEMÁTICA EN SUMA

        // B. Actualizamos la columna caché de saldos rápidos en el maestro de productos
        const updatePayload: any = { stock: calculatedFinalStock };
        
        // Si viaja el precio de compra del proveedor, actualizamos el costo en caliente en el maestro
        if (item.purchasePrice && item.purchasePrice > 0) {
          updatePayload.purchasePrice = Number(item.purchasePrice);
        }

        await productRow.update(updatePayload, { transaction });

        // C. TRAZABILIDAD CONTABLE: Insertamos la fila inmutable de egreso/ingreso en tu tabla 'product_kardex'
        await ProductKardexModel.create({
          subscriptionId: data.subscriptionId,
          companyId: data.companyId,
          branchId: data.branchId,
          productId: productRow.id,
          movementType: 'INGRESO',                       // Marca el incremento contable legal
          sourceDocument: data.sourceDocument.toUpperCase(), // Almacena la trazabilidad de la factura del proveedor
          quantity: qtyToIngress,
          previousStock: currentStock,
          actualStock: calculatedFinalStock
        }, { transaction });

        processedLogs.push(`📦 [${productRow.name}] -> Anterior: ${currentStock} | Añadido: +${qtyToIngress} | Actual: ${calculatedFinalStock}`);
      }

      // 🏁 CONSOLIDAMOS LOS DATOS EN MYSQL DE FORMA ATÓMICA
      await transaction.commit();

      console.log('✅ INGRESO LOGÍSTICO CONSOLIDADO CON ÉXITO:');
      processedLogs.forEach(log => console.log(log));
      console.log('========================================================================');

      return {
        success: true,
        message: `Ingreso de inventario registrado con éxito bajo el documento ${data.sourceDocument}.`,
        processedItemsCount: data.items.length
      };

    } catch (error) {
      // 💥 REBOTE AUTOMÁTICO: Si un solo ID falla o está corrupto, se evapora todo rastro de la RAM
      await transaction.rollback();
      throw error;
    }
  }
}