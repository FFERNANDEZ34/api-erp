import { BranchWarehouseModel } from '../../../infrastructure/database/models/branch-warehouse.model';

export class DeleteBranchUseCase {
  async execute(branchId: number, subscriptionId: number): Promise<void> {
    const branch = await BranchWarehouseModel.findOne({
      where: { id: branchId, subscriptionId }
    });

    if (!branch) {
      throw new Error('La sucursal o almacén que intenta dar de baja no existe.');
    }

    // 🔒 Mutamos el bit del flag preservando el registro para auditoría de Kardex
    await branch.update({ isActive: false });
  }
}