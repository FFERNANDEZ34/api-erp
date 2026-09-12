import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { UserModel } from '../../../infrastructure/database/models/user.model';
import { RoleModel } from '../../../infrastructure/database/models/role.model';
import { UserCompanyRoleModel } from '../../../infrastructure/database/models/user-company-role.model';
import bcrypt from 'bcrypt';

interface AssignmentInput {
  companyId: number;
  branchId: number;
  roleNames: string[];
}

export class CreateUserUseCase {
  async execute(data: { subscriptionId: number; email: string; passwordUnsecured: string; assignments: AssignmentInput[] }) {
    const existing = await UserModel.findOne({ where: { email: data.email } });
    if (existing) throw new Error('El email ya está registrado en el sistema.');

    // Abrimos transacción
    return await sequelizeInstance.transaction(async (t) => {
      
      const hashedPassword = await bcrypt.hash(data.passwordUnsecured, 10);
      
      // 1. Crear el usuario base dentro de la transacción
      const newUser = await UserModel.create({
        subscriptionId: data.subscriptionId,
        email: data.email,
        password: hashedPassword
      }, { transaction: t });

      // 2. Procesar el bucle de asignaciones dinámicas múltiples
      for (const assignment of data.assignments) {
        for (const roleName of assignment.roleNames) {
          
          // Busca el rol o lo crea en caliente participando de la transacción
          const [role] = await RoleModel.findOrCreate({ 
            where: { name: roleName.trim().toLowerCase() },
            transaction: t
          });

          // Guardar en la tabla intermedia. Si alguna llave foránea falla aquí,
          // Sequelize cancelará todo e impedirá que el usuario del paso 1 se guarde.
          await UserCompanyRoleModel.create({
            subscriptionId: data.subscriptionId,
            userId: newUser.id,
            companyId: assignment.companyId,
            branchId: assignment.branchId,
            roleId: role.id
          }, { transaction: t });
        }
      }

      return { id: newUser.id, email: newUser.email, assignments: data.assignments };
    });
  }
}