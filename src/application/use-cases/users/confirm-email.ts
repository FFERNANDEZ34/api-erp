import { UserModel } from "../../../infrastructure/database/models/user.model";
import { SubscriptionModel } from '../../../infrastructure/database/models/subscription.model'; 
import { Op } from "sequelize";
import { EmailService } from "../../../infrastructure/services/email.service";

export class ConfirmEmailUseCase {
  async execute(token: string) {
    if (!token)
      throw new Error("El token de confirmación de cuenta es requerido.");

    console.log(
      `🕵️‍♂️ [PERITAJE AUTH] Validando token de liberación criptográfica...`,
    );

     // 🎯 2. EL DESTRABE RELACIONAL: Declaramos el belongsTo si no se ha inicializado globalmente
    if (!UserModel.associations.Subscription) {
      UserModel.belongsTo(SubscriptionModel, { foreignKey: 'subscriptionId', as: 'Subscription' });
    }


    // Buscamos el usuario e incluimos de golpe su suscripción amarrada en Aiven
    const userRow = await UserModel.findOne({
      where: {
        emailConfirmationToken: token,
        tokenExpiresAt: { [Op.gt]: new Date() }
      },
      // Inyectamos el JOIN de infraestructura contable
      include: [{ model: SubscriptionModel, as: 'Subscription', attributes: ['contactName'] }]
    });

    if (!userRow) {
      throw new Error(
        "El enlace de verificación ha expirado o el token es totalmente inválido. Solicite un nuevo reenvío.",
      );
    }

    // 🎯 EL DESTRABE CONTABLE: Activamos la cuenta y purgamos los tokens para máxima seguridad
    await userRow.update({
      isEmailConfirmed: true,
      emailConfirmationToken: null,
      tokenExpiresAt: null,
    });

    console.log(
      `✅ CUENTA LIBERADA CON ÉXITO EN AIVEN. Usuario: [${userRow.email}]`,
    );

    try {
        const rawUser = userRow.toJSON() as any; 

         const realContactName = rawUser.Subscription?.contactName || 'Empresario SaaS';

      const emailService = new EmailService();
      await emailService.sendEmail(
        userRow.email,
        "🚀 ¡Bienvenido al ERP Enterprise!",
        "welcome-email.html",
        {
          contactName: realContactName,
          subscriptionId: userRow.subscriptionId,
        },
      );
    } catch (emailError: any) {
      // Capturamos el quiebre de red sin relanzarlo con throw. El flujo NO se detiene.
      console.error(
        "⚠️ [FALLO DE NOTIFICACIÓN DETECTADO Y AISLADO]:",
        emailError.message,
      );
      console.warn(
        "💡 La infraestructura inicial se consolidó con éxito en Aiven, ignorando el corte de sockets SMTP.",
      );
    }

    return {
      success: true,
      message:
        "¡Espectacular! Su correo electrónico ha sido verificado con éxito. Ya puede iniciar sesión en el ERP.",
    };
  }
}
