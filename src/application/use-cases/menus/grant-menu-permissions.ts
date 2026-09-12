import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { RoleMenuPermissionModel } from '../../../infrastructure/database/models/role-menu-permission.model';
import { RoleModel } from '../../../infrastructure/database/models/role.model';

export class GrantMenuPermissionsUseCase {
  async execute(data: { subscriptionId: number; roleName: string; menuOptionIds: number[] }) {
    
    // 1. Validar que el rol exista en el catálogo del sistema
    const role = await RoleModel.findOne({ where: { name: data.roleName.trim().toLowerCase() } });
    if (!role) throw new Error(`El rol '${data.roleName}' no existe en el sistema.`);

    // 2. Ejecutar la operación de forma Atómica/Transaccional
    return await sequelizeInstance.transaction(async (t) => {
      
      // Limpiar de golpe todas las asignaciones pasadas de este rol para esta suscripción
      await RoleMenuPermissionModel.destroy({
        where: { subscriptionId: data.subscriptionId, roleId: role.id },
        transaction: t
      });

      // Si el administrador desmarcó todo, salimos de inmediato
      if (!data.menuOptionIds || data.menuOptionIds.length === 0) return { message: 'Permisos removidos con éxito.' };

      // Preparar el arreglo masivo de inserción (Bulk Insert)
      const bulkRecords = data.menuOptionIds.map(menuId => ({
        subscriptionId: data.subscriptionId,
        roleId: role.id,
        menuOptionId: menuId
      }));

      // Insertar en bloque de alta velocidad
      await RoleMenuPermissionModel.bulkCreate(bulkRecords, { transaction: t });

      return {
        status: 'success',
        message: `Se asignaron correctamente ${data.menuOptionIds.length} opciones de menú al perfil '${data.roleName}'.`
      };
    });
  }
}