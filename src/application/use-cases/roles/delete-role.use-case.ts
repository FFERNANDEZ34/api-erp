import { RoleModel } from '../../../infrastructure/database/models/role.model';

export class DeleteRoleUseCase {
  async execute(subscriptionId: number, companyId: number, roleId: number) {
    const role = await RoleModel.findOne({ where: { id: roleId, subscriptionId, companyId } });
    if (!role) throw new Error('El perfil solicitado no pudo ser localizado en su compañía actual.');

    // Candado institucional inmutable
    if (role.name === 'super-admin' || role.name === 'cajero') {
      throw new Error(`Operación denegada. El perfil corporativo [${role.name.toUpperCase()}] es estructural y no puede inactivarse.`);
    }

    await role.update({ isActive: false });
    return { success: true, message: 'Perfil empresarial dado de baja e inhabilitado con éxito.' };
  }
}