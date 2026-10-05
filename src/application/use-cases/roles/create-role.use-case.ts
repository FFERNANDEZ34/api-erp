import { RoleModel } from '../../../infrastructure/database/models/role.model';

export class CreateRoleUseCase {
  async execute(subscriptionId: number, companyId: number, name: string, description?: string) {
    const cleanName = String(name).trim().toLowerCase();

    // 🎯 REGLA DE INTEGRIDAD COMBINADA: Evitamos duplicar el mismo rol en la misma empresa del tenant
    const existing = await RoleModel.findOne({ 
      where: { subscriptionId, companyId, name: cleanName, isActive: true } 
    });
    if (existing) throw new Error(`El rol o perfil [${cleanName.toUpperCase()}] ya se encuentra registrado para esta compañía.`);

    const newRole = await RoleModel.create({
      subscriptionId,
      companyId,
      name: cleanName,
      description: description || null,
      isActive: true
    });

    return { id: newRole.id, name: newRole.name, description: newRole.description };
  }
}