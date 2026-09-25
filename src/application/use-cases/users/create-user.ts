import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { UserModel } from '../../../infrastructure/database/models/user.model';
import { RoleModel } from '../../../infrastructure/database/models/role.model';
import { UserCompanyRoleModel } from '../../../infrastructure/database/models/user-company-role.model';
import { EmailService } from '../../../infrastructure/services/email.service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

interface AssignmentInput {
  companyId: number;
  branchId: number;
  roleNames: string[];
}

export class CreateUserUseCase {
  async execute(data: { subscriptionId: number; email: string; name: string; phone?: string; address?: string; passwordUnsecured: string; assignments: AssignmentInput[] }) {
    const emailClean = data.email.trim().toLowerCase();

    const existing = await UserModel.findOne({ where: { email: emailClean } });
    if (existing) throw new Error('El email ya está registrado en el sistema.');

    return await sequelizeInstance.transaction(async (t) => {
      const hashedPassword = await bcrypt.hash(data.passwordUnsecured, 10);
      const secureToken = crypto.randomBytes(32).toString('hex');
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);

      // 1. Nace con mustChangePassword = true e isActive = true
      const newUser = await UserModel.create({
        subscriptionId: data.subscriptionId,
        email: emailClean,
        name: data.name.toUpperCase().trim(),
        phone: data.phone || null,
        address: data.address || null,
        password: hashedPassword,
        mustChangePassword: true, // 🔒 Obligatorio cambiar en su primer uso
        isEmailConfirmed: false,
        emailConfirmationToken: secureToken,
        tokenExpiresAt: expirationDate,
        isActive: true
      }, { transaction: t });

      for (const assignment of data.assignments) {
        for (const roleName of assignment.roleNames) {
          const [role] = await RoleModel.findOrCreate({ 
            where: { name: roleName.trim().toLowerCase() },
            transaction: t
          });

          await UserCompanyRoleModel.create({
            subscriptionId: data.subscriptionId,
            userId: newUser.id,
            companyId: assignment.companyId,
            branchId: assignment.branchId,
            roleId: role.id
          }, { transaction: t });
        }
      }

      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const confirmationLink = `${frontendBaseUrl}/auth/confirm-email?token=${secureToken}`;

      try {
        const emailService = new EmailService();
        await emailService.sendEmail(emailClean, '🔐 ACCESO CONCEDIDO: Active su cuenta de colaborador', 'verification-email.html', {
          contactName: newUser.name,
          confirmationLink: confirmationLink
        });
      } catch (emailError: any) {
        console.error('⚠️ [FALLO DE NOTIFICACIÓN DE SUB-USUARIO]:', emailError.message);
      }

      return { id: newUser.id, email: newUser.email, name: newUser.name, confirmationLink };
    });
  }
}