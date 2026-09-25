import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { UserModel } from '../../../infrastructure/database/models/user.model';
import { RoleModel } from '../../../infrastructure/database/models/role.model';
import { UserCompanyRoleModel } from '../../../infrastructure/database/models/user-company-role.model';

interface AssignmentInput {
  companyId: number;
  branchId: number;
  roleNames: string[];
}

export interface UpdateUserInput {
  subscriptionId: number;
  userId: number;
  assignments: AssignmentInput[];
}

export class UpdateUserUseCase {
  async execute(data: UpdateUserInput) {
    console.log(`🛡️ [BÚNKER EDICIÓN ACID] Sincronizando asignaciones para Usuario ID: [${data.userId}]`);

    // Validamos que el usuario pertenezca de forma legítima al tenant solicitante
    const userExists = await UserModel.findOne({ 
      where: { id: data.userId, subscriptionId: data.subscriptionId, isActive: true } 
    });
    
    if (!userExists) {
      throw new Error('El colaborador seleccionado no corresponde a la configuración de su empresa.');
    }

    return await sequelizeInstance.transaction(async (t) => {
      // 1. 🧹 PURGA ATÓMICA: Limpiamos todos los accesos anteriores del colaborador en este tenant
      await UserCompanyRoleModel.destroy({
        where: { userId: data.userId, subscriptionId: data.subscriptionId },
        transaction: t
      });

      // 2. 💾 RECONSTRUCCIÓN: Poblamos el nuevo lote de asignaciones múltiples
      for (const assignment of data.assignments) {
        for (const roleName of assignment.roleNames) {
          
          // Buscamos o creamos el perfil en caliente participando de la transacción
          const [role] = await RoleModel.findOrCreate({ 
            where: { name: roleName.trim().toLowerCase() },
            transaction: t
          });

          // Inyectamos la fila en la tabla intermedia
          await UserCompanyRoleModel.create({
            subscriptionId: data.subscriptionId,
            userId: data.userId,
            companyId: assignment.companyId,
            branchId: assignment.branchId,
            roleId: role.id,
            isDefault: false
          }, { transaction: t });
        }
      }

      return { 
        success: true, 
        message: 'Matriz de asignaciones, compañías y locales del colaborador actualizada con éxito en Aiven.' 
      };
    });
  }
}