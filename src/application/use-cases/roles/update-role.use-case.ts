import { RoleModel } from '../../../infrastructure/database/models/role.model';

export class UpdateRoleUseCase {
  async execute(subscriptionId: number, companyId: number, roleId: number, newName: string, description?: string) {
    const cleanName = String(newName).trim().toLowerCase();

    const role = await RoleModel.findOne({ where: { id: roleId, subscriptionId, companyId, isActive: true } });
    if (!role) throw new Error('El perfil solicitado no pertenece a la configuración de su compañía actual.');

    // Validamos el índice único compuesto del DDL
    const duplicated = await RoleModel.findOne({ where: { subscriptionId, companyId, name: cleanName, isActive: true } });
    if (duplicated && duplicated.id !== roleId) throw new Error('Ya existe otro perfil registrado con ese mismo nombre en esta empresa.');

    await role.update({ 
      name: cleanName,
      description: description !== undefined ? description : role.description
    });
    
    return { success: true, message: 'Perfil corporativo actualizado correctamente en la nube.' };
  }
}