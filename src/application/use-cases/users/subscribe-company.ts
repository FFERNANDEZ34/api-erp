import { sequelizeInstance } from "../../../infrastructure/database/sequelize.config";
import { SubscriptionModel } from "../../../infrastructure/database/models/subscription.model";
import { CompanyModel } from "../../../infrastructure/database/models/company.model";
import { UserModel } from "../../../infrastructure/database/models/user.model";
import { BranchWarehouseModel } from "../../../infrastructure/database/models/branch-warehouse.model";
import { RoleModel } from "../../../infrastructure/database/models/role.model";
import { UserCompanyRoleModel } from "../../../infrastructure/database/models/user-company-role.model";
import { EmailService } from "../../../infrastructure/services/email.service"; 

import bcrypt from "bcrypt";
import crypto from "crypto"; // 🚀 Librería nativa de Node.js para criptografía

export class SubscribeCompanyUseCase {
  async execute(data: {
    contactName: string;
    contactEmail: string;
    passwordUnsecured: string;
    companyName: string;
    companyRuc: string;
    employeeCount: number;
  }) {
    const emailClean = String(data.contactEmail).trim().toLowerCase();

    // 1. Validaciones previas antes de abrir la transacción (Ahorra recursos)
    const userExists = await UserModel.findOne({
      where: { email: emailClean },
    });
    if (userExists) throw new Error("El correo electrónico ya está registrado");

    if (!/^\d{11}$/.test(data.companyRuc)) {
      throw new Error(
        "El RUC de la compañía debe tener exactamente 11 dígitos numéricos.",
      );
    }

     if (!/^(10|15|17|20)\d{9}$/.test(data.companyRuc)) {
      throw new Error('El RUC de la compañía es inválido. Debe tener exactamente 11 dígitos y comenzar con un prefijo tributario válido (10, 15, 17 o 20).');
    }

    const rucExists = await CompanyModel.findOne({
      where: { ruc: data.companyRuc },
    });
    if (rucExists)
      throw new Error("Este RUC ya se encuentra registrado en el sistema.");

    // 2. Iniciamos la transacción gestionada por Sequelize
    return await sequelizeInstance.transaction(async (t) => {
      // Capa 1: Crear Suscripción (Pasando el objeto transaction)
      const subscription = await SubscriptionModel.create(
        {
          contactName: data.contactName,
          contactEmail: emailClean,
          maxCompanies: 3,
        },
        { transaction: t },
      );

      // Capa 2: Crear Compañía
      const company = await CompanyModel.create(
        {
          subscriptionId: subscription.id,
          name: data.companyName,
          ruc: data.companyRuc,
        },
        { transaction: t },
      );

      // Capa 3: Crear Local/Almacén por defecto
      const branch = await BranchWarehouseModel.create(
        {
          subscriptionId: subscription.id,
          companyId: company.id,
          name: "Sede Principal - Almacén Central",
          isPointOfSale: true,
          isWarehouse: true,
        },
        { transaction: t },
      );

      // 🎯 GENERACIÓN DEL TOKEN CRIPTOGRÁFICO DE VERIFICACIÓN
      const secureToken = crypto.randomBytes(32).toString("hex");
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24); // Expiración: 24 horas

      // Capa 4: Crear Usuario Maestro incorporando candados de ciberseguridad Multi-tenant
      const hashedPassword = await bcrypt.hash(data.passwordUnsecured, 10);
      const adminUser = await UserModel.create(
        {
          subscriptionId: subscription.id,
          email: emailClean,
          password: hashedPassword,
          isEmailConfirmed: false, // 🔒 Nace bloqueado de forma defensiva hasta confirmar correo
          emailConfirmationToken: secureToken,
          tokenExpiresAt: expirationDate,
        },
        { transaction: t },
      );

      // Capa 5: Asegurar el Rol 'super-admin'
      const [role] = await RoleModel.findOrCreate({
        where: { name: "super-admin" },
        transaction: t,
      });

      // Capa 6: Intersección final de permisos
      await UserCompanyRoleModel.create(
        {
          subscriptionId: subscription.id,
          userId: adminUser.id,
          companyId: company.id,
          branchId: branch.id,
          roleId: role.id,
          isDefault: true,
        },
        { transaction: t },
      );

      // 🛠️ Extraemos la URL base del .env con fallback defensivo local
      const frontendBaseUrl =
        process.env.FRONTEND_URL || "http://localhost:4200";
      const confirmationLink = `${frontendBaseUrl}/auth/confirm-email?token=${secureToken}`;

      console.log(
        `==========================================================================`,
      );
      console.log(
        `📡 [NÚCLEO SUSCRIPCIONES] Nueva cuenta SaaS en espera de verificación: [${emailClean}]`,
      );
      console.log(`🔗 Link de activación: ${confirmationLink}`);
      console.log(
        `==========================================================================`,
      );

      // =========================================================================
      // 🛡️ BÚNKER DEFENSIVO DE NOTIFICACIONES (TOLERANTE A FALLOS)
      // Evita de forma atómica que un fallo de correo aborte la transacción ACID
      // =========================================================================
      try {
        const emailService = new EmailService();
        
        // Disparamos consumiendo el nuevo motor polimórfico universal
        await emailService.sendEmail(
          emailClean, 
          '🔐 ACCESO REQUERIDO: Confirme su cuenta', 
          'verification-email.html', 
          {
            contactName: data.contactName,
            confirmationLink: confirmationLink
          }
        );
      } catch (emailError: any) {
        // Capturamos el quiebre de red sin relanzarlo con throw. El flujo NO se detiene.
        console.error('⚠️ [FALLO DE NOTIFICACIÓN DETECTADO Y AISLADO]:', emailError.message);
        console.warn('💡 La infraestructura inicial se consolidó con éxito en Aiven, ignorando el corte de sockets SMTP.');
      }
      //--------------------------------------------------------------------

      // Si el código llega aquí sin errores, Sequelize ejecuta el COMMIT de forma automática
      return {
        status: "success",
        message:
          "Suscripción e infraestructura inicial creadas con éxito absoluto. Por favor verifique su correo.",
        data: {
          subscriptionId: subscription.id,
          companyId: company.id,
          branchId: branch.id,
          userId: adminUser.id,
          isEmailConfirmed: false,
          confirmationLink, // 🚀 ¡RETORNADO EN TU RESPUESTA DE POSTMAN!
        },
      };
    });
  }
}
