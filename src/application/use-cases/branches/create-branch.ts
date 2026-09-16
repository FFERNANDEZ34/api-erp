import { BranchWarehouseModel } from '../../../infrastructure/database/models/branch-warehouse.model';

export interface CreateBranchInput {
  subscriptionId: number;
  companyId: number;
  name: string;
  address?: string | null;
  isPointOfSale: boolean;
  isWarehouse: boolean;
  defaultWarehouseId?: number | null;
}

export class CreateBranchUseCase {
  async execute(data: CreateBranchInput) {
    // 🛡️ Validación autorreferencial preventiva:
    if (data.defaultWarehouseId) {
      const warehouse = await BranchWarehouseModel.findOne({
        where: { id: data.defaultWarehouseId, subscriptionId: data.subscriptionId, isWarehouse: true }
      });
      if (!warehouse) {
        throw new Error('El almacén por defecto seleccionado no es válido o no está configurado como almacén.');
      }
    }

    const newBranch = await BranchWarehouseModel.create({
      subscriptionId: data.subscriptionId,
      companyId: data.companyId,
      name: data.name.trim(),
      address: data.address?.trim() || null,
      isPointOfSale: data.isPointOfSale,
      isWarehouse: data.isWarehouse,
      defaultWarehouseId: data.defaultWarehouseId || null,
      isActive: true
    });

     await newBranch.save();
    await newBranch.reload();
    return newBranch.get({ plain: true });
  }
}