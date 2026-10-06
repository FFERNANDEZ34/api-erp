import { SubscriptionModel } from '../../../infrastructure/database/models/subscription.model';
import { SubscriptionApplicationModel } from '../../../infrastructure/database/models/subscription-application.model';
import { UserModel } from '../../../infrastructure/database/models/user.model';
import { EmailService } from '../../../infrastructure/services/email.service';
import crypto from 'crypto';

export class AdminSubscriptionsUseCase {
  
  /**
   * 🔍 CONSULTA GLOBAL DE CLIENTES ERP (Para la pantalla del Dueño del Software)
   */
  async listAllSubscriptions(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    const { rows, count } = await SubscriptionModel.findAndCountAll({
      order: [['id', 'DESC']],
      limit,
      offset,
      raw: true
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      rows
    };
  }

  /**
   * ⚡ REENVÍO FORZADO DE ADMISIÓN (El destrabe que necesitas activar ahora)
   */
  async resendSubscriptionWelcome(subscriptionId: number) {
    console.log(`📡 [BACKOFFICE MÁSTER] Forzando retransmisión de token para Suscripción ID: [${subscriptionId}]`);

    // 1. Buscamos la suscripción base
    const subscription = await SubscriptionModel.findByPk(subscriptionId);
    if (!subscription) throw new Error('La suscripción solicitada no existe en el registro central.');

    // 2. Localizamos al usuario administrador master asociado a ese holding
    const adminUser = await UserModel.findOne({
      where: { subscriptionId: subscription.id, email: subscription.contactEmail }
    });
    if (!adminUser) throw new Error('No se localizó al usuario administrador máster de esta cuenta.');

    // 3. Generamos un token fresh de ciberseguridad criptográfica
    const freshToken = crypto.randomBytes(32).toString('hex');
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24); // Fresh por 24 horas

    // 4. Actualizamos de forma atómica en MySQL
    await adminUser.update({
      emailConfirmationToken: freshToken,
      tokenExpiresAt: expirationDate
    });

    // 5. Re-fabricamos el enlace transaccional
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:4200";
    const confirmationLink = `${frontendBaseUrl}/auth/confirm-email?token=${freshToken}`;

    // 🚀 DISPARO DE RESCATE TOLERANTE A FALLOS TLS VÍA BREVO SANEADO
    try {
      const emailService = new EmailService();
      await emailService.sendEmail(
        subscription.contactEmail, 
        '🔐 ACCESO REQUERIDO: Confirme su cuenta corporativa', 
        'verification-email.html', 
        {
          contactName: subscription.contactName,
          confirmationLink: confirmationLink
        }
      );
    } catch (emailError: any) {
      console.error('❌ [FALLO SMTP AISLADO EN REENVÍO BACKOFFICE]:', emailError.message);
      throw new Error(`El token se actualizó en la BD, pero Brevo rechazó la entrega: ${emailError.message}`);
    }

    return {
      success: true,
      message: `Enlace de activación despachado con éxito absoluto al buzón [${subscription.contactEmail}].`,
      confirmationLink // Devuelto para auditoría directa en Postman
    };
  }

  /**
   * 🔌 UPGRADE ADD-ON: Conceder nuevas aplicaciones (Restaurante, producción, etc.)
   */
  async grantApplicationToTenant(subscriptionId: number, applicationId: number) {
    // Registra la nueva licencia bajo demanda de forma atómica en tu tabla puente
    await SubscriptionApplicationModel.findOrCreate({
      where: { subscriptionId, applicationId }
    });
    return { success: true, message: 'Módulo comercial activado correctamente en la cuenta del cliente.' };
  }
}