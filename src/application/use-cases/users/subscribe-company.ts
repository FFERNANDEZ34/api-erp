import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { SubscriptionModel } from '../../../infrastructure/database/models/subscription.model';
import { CompanyModel } from '../../../infrastructure/database/models/company.model';
import { UserModel } from '../../../infrastructure/database/models/user.model';
import { BranchWarehouseModel } from '../../../infrastructure/database/models/branch-warehouse.model';
import { RoleModel } from '../../../infrastructure/database/models/role.model';
import { UserCompanyRoleModel } from '../../../infrastructure/database/models/user-company-role.model';
import bcrypt from 'bcrypt';

export class SubscribeCompanyUseCase {
  async execute(data: { contactName: string; contactEmail: string; passwordUnsecured: string; companyName: string; companyRuc: string; employeeCount: number }) {
    
    // 1. Validaciones previas antes de abrir la transacción (Ahorra recursos)
    const userExists = await UserModel.findOne({ where: { email: data.contactEmail } });
    if (userExists) throw new Error('El correo electrónico ya está registrado');

    if (!/^\d{11}$/.test(data.companyRuc)) throw new Error('El RUC de la compañía debe tener exactamente 11 dígitos.');
    const rucExists = await CompanyModel.findOne({ where: { ruc: data.companyRuc } });
    if (rucExists) throw new Error('Este RUC ya se encuentra registrado en el sistema.');

    // 2. Iniciamos la transacción gestionada por Sequelize
    return await sequelizeInstance.transaction(async (t) => {
      
      // Capa 1: Crear Suscripción (Pasando el objeto transaction)
      const subscription = await SubscriptionModel.create({
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        maxCompanies: 3
      }, { transaction: t });

      // Capa 2: Crear Compañía
      const company = await CompanyModel.create({
        subscriptionId: subscription.id,
        name: data.companyName,
        ruc: data.companyRuc
      }, { transaction: t });

      // Capa 3: Crear Local/Almacén por defecto
      const branch = await BranchWarehouseModel.create({
        subscriptionId: subscription.id,
        companyId: company.id,
        name: 'Sede Principal - Almacén Central',
        isPointOfSale: true,
        isWarehouse: true
      }, { transaction: t });

      // Capa 4: Crear Usuario Maestro
      const hashedPassword = await bcrypt.hash(data.passwordUnsecured, 10);
      const adminUser = await UserModel.create({
        subscriptionId: subscription.id,
        email: data.contactEmail,
        password: hashedPassword
      }, { transaction: t });

      // Capa 5: Asegurar el Rol 'super-admin'
      const [role] = await RoleModel.findOrCreate({
        where: { name: 'super-admin' },
        transaction: t
      });

      // Capa 6: Intersección final de permisos
      await UserCompanyRoleModel.create({
        subscriptionId: subscription.id,
        userId: adminUser.id,
        companyId: company.id,
        branchId: branch.id,
        roleId: role.id
      }, { transaction: t });

      // Si el código llega aquí sin errores, Sequelize ejecuta el COMMIT de forma automática
      return {
        status: 'success',
        message: 'Suscripción e infraestructura inicial creadas con éxito absoluto.',
        data: { subscriptionId: subscription.id, companyId: company.id, branchId: branch.id, userId: adminUser.id }
      };
    });
  }
}