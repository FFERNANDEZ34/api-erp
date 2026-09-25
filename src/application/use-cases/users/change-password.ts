import { UserModel } from '../../../infrastructure/database/models/user.model';
import { EmailService } from '../../../infrastructure/services/email.service'; // 🚀 IMPORTA TU MOTOR UNIVERSAL

import bcrypt from 'bcrypt';

export class ChangePasswordUseCase {
  async execute(userId: number, passwordNew: string) {
    console.log(`🛡️ [CORTAFUEGOS CLAVES] Procesando actualización obligatoria para Usuario ID: [${userId}]`);

    const userRow = await UserModel.findByPk(userId);
    if (!userRow) throw new Error('El usuario no pudo ser localizado en el sistema.');

    // 1. Encriptamos la nueva contraseña secreta elegida por el empleado
    const hashedPassword = await bcrypt.hash(passwordNew, 10);

    // 2. 🎯 EL DESTRABE: Actualizamos la clave y apagamos el switch de cambio obligatorio
    await userRow.update({
      password: hashedPassword,
      mustChangePassword: false // 🔓 Cuenta liberada oficialmente para operar el ERP
    });

    // =========================================================================
    // 🛡️ BÚNKER DEFENSIVO DE NOTIFICACIÓN DE AUDITORÍA (TOLERANTE A FALLOS)
    // Despacha la nueva plantilla de alerta roja al buzón del colaborador
    // =========================================================================
    try {
      const emailService = new EmailService();
      await emailService.sendEmail(
        userRow.email,
        '🛡️ ALERTA DE SEGURIDAD: Contraseña actualizada con éxito',
        'password-changed-email.html', // 🎯 Consumimos tu nueva plantilla externa
        {
          contactName: userRow.name || 'Colaborador ERP' // Comodín interpolado dinámicamente
        }
      );
    } catch (emailError: any) {
      console.error('⚠️ [FALLO DE NOTIFICACIÓN AUDITORÍA CLAVES AISLADO]:', emailError.message);
    }
    // =========================================================================


    return {
      success: true,
      message: '¡Excelente! Su contraseña ha sido actualizada con éxito. Ya puede ingresar a la plataforma.'
    };
  }
}