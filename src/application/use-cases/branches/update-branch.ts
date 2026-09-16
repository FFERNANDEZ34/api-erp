import { BranchWarehouseModel } from '../../../infrastructure/database/models/branch-warehouse.model';

export class UpdateBranchUseCase {
  async execute(branchId: number, subscriptionId: number, data: any) {
    const branch = await BranchWarehouseModel.findOne({
      where: { id: branchId, subscriptionId }
    });

    if (!branch) {
      throw new Error('La sucursal comercial solicitada no existe en su holding.');
    }

    // Validar el almacén por defecto si intentan cambiarlo
    if (data.defaultWarehouseId) {
      if (Number(data.defaultWarehouseId) === branchId) {
        throw new Error('Un punto de venta no puede asignarse a sí mismo como almacén por defecto de manera cíclica.');
      }
      const warehouse = await BranchWarehouseModel.findOne({
        where: { id: data.defaultWarehouseId, subscriptionId, isWarehouse: true }
      });
      if (!warehouse) {
        throw new Error('El almacén por defecto seleccionado no es válido.');
      }
    }

    await branch.update(data);
    await branch.reload();
    return branch.get({ plain: true });
  }
}