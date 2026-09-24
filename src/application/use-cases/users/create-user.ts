import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { UserModel } from '../../../infrastructure/database/models/user.model';
import { RoleModel } from '../../../infrastructure/database/models/role.model';
import { UserCompanyRoleModel } from '../../../infrastructure/database/models/user-company-role.model';
import bcrypt from 'bcrypt';
import crypto from 'crypto'; // 🚀 Librería nativa de Node.js para criptografía de alta entropía

interface AssignmentInput {
  companyId: number;
  branchId: number;
  roleNames: string[];
}

export class CreateUserUseCase {
  async execute(data: { subscriptionId: number; email: string; passwordUnsecured: string; assignments: AssignmentInput[] }) {
    const emailClean = String(data.email).trim().toLowerCase();

    const existing = await UserModel.findOne({ where: { email: emailClean } });
    if (existing) throw new Error('El email ya está registrado en el sistema.');

    // Abrimos la transacción gestionada por Sequelize
    return await sequelizeInstance.transaction(async (t) => {
      
      const hashedPassword = await bcrypt.hash(data.passwordUnsecured, 10);
      
      // 🎯 GENERACIÓN DEL TOKEN CRIPTOGRÁFICO DE VERIFICACIÓN
      const secureToken = crypto.randomBytes(32).toString('hex');
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24); // Ventana de vida: 24 horas

      // 1. Crear el usuario base inyectando los candados de seguridad en Aiven
      const newUser = await UserModel.create({
        subscriptionId: data.subscriptionId,
        email: emailClean,
        password: hashedPassword,
        isEmailConfirmed: false, // 🔒 Nace bloqueado por defecto hasta que confirme
        emailConfirmationToken: secureToken,
        tokenExpiresAt: expirationDate
      }, { transaction: t });

      // 2. Procesar el bucle de asignaciones dinámicas múltiples intacto
      for (const assignment of data.assignments) {
        for (const roleName of assignment.roleNames) {
          
          // Busca el rol o lo crea en caliente participando de la transacción
          const [role] = await RoleModel.findOrCreate({ 
            where: { name: roleName.trim().toLowerCase() },
            transaction: t
          });

          // Guardar en la tabla intermedia de seguridad multi-tenant
          await UserCompanyRoleModel.create({
            subscriptionId: data.subscriptionId,
            userId: newUser.id,
            companyId: assignment.companyId,
            branchId: assignment.branchId,
            roleId: role.id
          }, { transaction: t });
        }
      }

      // 📡 RADAR NOTIFICACIONES LOCALES (Simulador de Link para tu Angular)
    
       // 1. Capturamos la URL base desde las variables de entorno, con un fallback defensivo
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

      // 2. 🎯 CONSTRUCCIÓN CON AUTORIDAD Y VARIABLE DINÁMICA:
      const confirmationLink = `${frontendBaseUrl}/auth/confirm-email?token=${secureToken}`;
    
      console.log(`==========================================================================`);
      console.log(`📡 [NÚCLEO NOTIFICACIONES] Correo registrado: [${emailClean}]`);
      console.log(`🔗 Enlace de Verificación generado para Angular:`);
      console.log(`   [${confirmationLink}]`);
      console.log(`==========================================================================`);

      // Retornamos el payload incorporando el link para pruebas rápidas de red en Postman
      return { 
        id: newUser.id, 
        email: newUser.email, 
        isEmailConfirmed: false,
        confirmationLink, // Permite capturarlo en Postman en un segundo
        assignments: data.assignments 
      };
    });
  }
}