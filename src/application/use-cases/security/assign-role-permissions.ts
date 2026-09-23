import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { RoleModel } from '../../../infrastructure/database/models/role.model';
import { RoleMenuPermissionModel } from '../../../infrastructure/database/models/role-menu-permission.model';

export interface AssignRolePermissionsInput {
  subscriptionId: number;
  companyId: number;
  roleId: number;
  menuOptionIds: number[];
}

export class AssignRolePermissionsUseCase {
  async execute(data: AssignRolePermissionsInput) {
    console.log(`🛡️ [MATRIZ DE ACCESOS AIVEN] Sincronizando Perfil ID: [${data.roleId}] | Opciones seleccionadas: ${data.menuOptionIds.length}`);

    // 🚀 INICIALIZAMOS TRANSACCIÓN ACID EN LA NUBE
    const transaction = await sequelizeInstance.transaction();

    try {
      // 1. Validamos que el rol pertenezca de forma legítima al tenant solicitante
      const roleExists = await RoleModel.findOne({
        where: { id: data.roleId, subscriptionId: data.subscriptionId, companyId: data.companyId },
        transaction
      });

      if (!roleExists) throw new Error('El perfil seleccionado no corresponde a la configuración de su empresa.');

      // 2. 🧹 PURGA ATÓMICA: Limpiamos los accesos del rol aislando por tu subscriptionId
      await RoleMenuPermissionModel.destroy({
        where: { roleId: data.roleId, subscriptionId: data.subscriptionId },
        transaction
      });

      // 3. 💾 INSERCIÓN EN BLOQUE: Poblamos la matriz respetando tu clave 'unique_role_menu'
      if (data.menuOptionIds && data.menuOptionIds.length > 0) {
        const payloads = data.menuOptionIds.map(menuOptionId => ({
          subscriptionId: data.subscriptionId, // 🎯 Requerido por tu índice único compuesto
          roleId: data.roleId,
          menuOptionId: Number(menuOptionId)
        }));

        await RoleMenuPermissionModel.bulkCreate(payloads, { transaction });
      }

      await transaction.commit();
      console.log('✅ OPERACIÓN DE PERMISOS CONSOLIDADA EXITOSAMENTE EN AIVEN.');

      return {
        success: true,
        message: 'Matriz de accesos y menús autorizados configurada con éxito.',
        assignedCount: data.menuOptionIds.length
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}