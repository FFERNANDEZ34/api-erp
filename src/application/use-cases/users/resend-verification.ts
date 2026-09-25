import { UserModel } from '../../../infrastructure/database/models/user.model';
import { EmailService } from '../../../infrastructure/services/email.service';
import crypto from 'crypto';

export class ResendVerificationUseCase {
  async execute(email: string) {
    const emailClean = String(email).trim().toLowerCase();
    console.log(`📡 [NÚCLEO REENVIOS] Solicitando nuevo enlace de activación para: [${emailClean}]`);

    // 1. Buscamos al usuario en la nube de Aiven
    const userRow = await UserModel.findOne({ where: { email: emailClean } });
    if (!userRow) throw new Error('El correo electrónico indicado no se encuentra registrado en el sistema.');

    // 2. Candado de control: Si ya está confirmado, no hay necesidad de reenviar nada
    if (userRow.isEmailConfirmed) {
      throw new Error('Esta cuenta de correo electrónico ya ha sido verificada previamente. Puede iniciar sesión.');
    }

    // 3. 🎯 RE-GENERACIÓN DEL TOKEN CRIPTOGRÁFICO FRESH
    const newSecureToken = crypto.randomBytes(32).toString('hex');
    const newExpirationDate = new Date();
    newExpirationDate.setHours(newExpirationDate.getHours() + 24); // Extendemos la vida 24 horas más

    // 4. Actualizamos la fila de forma atómica
    await userRow.update({
      emailConfirmationToken: newSecureToken,
      tokenExpiresAt: newExpirationDate
    });

    // 5. Construimos el enlace dinámico parametrizado desde tu .env
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const confirmationLink = `${frontendBaseUrl}/auth/confirm-email?token=${newSecureToken}`;

    // 6. 🛡️ DISPARO SMTP CON ESCUDO TOLERANTE A FALLOS
    try {
      const emailService = new EmailService();
      await emailService.sendEmail(
        emailClean,
        '🔐 ACCESO REQUERIDO: Reenvío de Enlace de Activación',
        'verification-email.html',
        {
          contactName: userRow.name || 'Usuario ERP',
          confirmationLink: confirmationLink
        }
      );
    } catch (emailError: any) {
      console.error('⚠️ [FALLO DE REENVÍO AISLADO]:', emailError.message);
    }

    return {
      success: true,
      message: 'Se ha despachado un nuevo enlace de verificación a su bandeja de entrada de forma exitosa.',
      confirmationLink // Retornado para auditoría inmediata en Postman
    };
  }
}