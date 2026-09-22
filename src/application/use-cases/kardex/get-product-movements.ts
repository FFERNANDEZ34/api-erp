import { ProductKardexModel } from '../../../infrastructure/database/models/product-kardex.model';

export class GetProductMovementsUseCase {
  async execute(params: { subscriptionId: number; companyId: number; productId: number; branchId?: number }) {
    console.log(`🕵️‍♂️ [AUDITORÍA INTERNA] Extrayendo historial de Kardex para Producto ID: [${params.productId}]`);

    const whereCondition: any = {
      subscriptionId: params.subscriptionId,
      companyId: params.companyId,
      productId: params.productId
    };

    // Si filtran por un almacén/sucursal específico, refinamos la búsqueda
    if (params.branchId) {
      whereCondition.branchId = params.branchId;
    }

    const movements = await ProductKardexModel.findAll({
      where: whereCondition,
      order: [['id', 'DESC']], // Del movimiento más nuevo al más antiguo
      raw: true
    });

    return movements.map((m: any) => ({
      kardexId: m.id,
      branchId: m.branchId, // Identificador del Almacén físico
      movementType: m.movementType, // 'INGRESO' o 'SALIDA'
      sourceDocument: m.sourceDocument, // Ej: 'B001-00000002' o 'INV-INICIAL'
      quantity: Number(m.quantity || 0),
      previousStock: Number(m.previousStock || 0),
      actualStock: Number(m.actualStock || 0),
      dateTimestamp: m.createdAt // Marca de tiempo real MySQL
    }));
  }
}