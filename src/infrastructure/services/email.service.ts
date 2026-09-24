import nodemailer, { Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';

export class EmailService {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || '://gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * 🚀 TRANSMISOR UNIVERSAL DE NOTIFICACIONES SAAS
   * @param to Correo electrónico del destinatario
   * @param subject Asunto del mensaje
   * @param templateName Nombre físico del archivo HTML (ej: 'verification-email.html')
   * @param context Objeto dinámico de variables clave-valor para interpolar en la plantilla
   */
  async sendEmail(to: string, subject: string, templateName: string, context: Record<string, string | number>): Promise<boolean> {
    const fromName = process.env.SMTP_FROM_NAME || 'SaaS ERP Platform';
    const fromEmail = process.env.SMTP_USER;

    try {
      // 📂 1. Armamos la ruta física apuntando al archivo dinámico solicitado
      const templatePath = path.join(__dirname, '../templates', templateName);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`La plantilla de notificación [${templateName}] no existe en el directorio de infraestructura.`);
      }

      // 📖 2. Leemos la plantilla elegida en disco
      let htmlContent = fs.readFileSync(templatePath, 'utf8');

      // 🔄 3. INTERPOLACIÓN DINÁMICA UNIVERSAL:
      // Barremos todas las llaves del objeto context (ej: contactName, confirmationLink, subscriptionId)
      // y reemplazamos de forma masiva los patrones {{llave}} dentro del HTML
      Object.keys(context).forEach((key) => {
        const value = String(context[key]);
        const regex = new RegExp(`{{${key}}}`, 'g'); // Busca todas las ocurrencias globales de {{key}}
        htmlContent = htmlContent.replace(regex, value);
      });

      // 📡 4. Despachamos el correo real hacia los servidores mundiales SMTP
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: subject,
        html: htmlContent
      });

      console.log(`✅ [SMTP MULTI-FLOW] Notificación [${templateName}] enviada con éxito total hacia [${to}]`);
      return true;

    } catch (error: any) {
      console.error(`❌ [CRASH EN MOTOR DE MENSAJERÍA UNIVERSAL - TEMPLATE: ${templateName}]:`, error.message);
      return false;
    }
  }
}