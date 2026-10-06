// src/presentation/http/controllers/admin.controller.ts
import { Response } from 'express';
import { AdminSubscriptionsUseCase } from '../../../application/use-cases/admin/admin-subscriptions.use-case';
import { UserCompanyRoleModel } from '../../../infrastructure/database/models/user-company-role.model'; // 🚀 IMPORTA TU TABLA PUENTE
import { RoleModel } from '../../../infrastructure/database/models/role.model';                       // 🚀 IMPORTA TUS ROLES STRUCT
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export class AdminController {
  private readonly adminSubscriptionsUseCase: AdminSubscriptionsUseCase;

  constructor() {
    this.adminSubscriptionsUseCase = new AdminSubscriptionsUseCase();
  }

  // 📡 GET /api/admin/subscriptions
  async getAllTenants(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const subscriptionId = req.user?.subscriptionId;

      if (!userId || !subscriptionId) {
        return res.status(401).json({ status: "fail", message: "Sesión corrupta o expirada." });
      }

      // =========================================================================
      // 🛡️ CORTAFUEGOS RELACIONAL OWASP: CONSULTA DE PRIVILEGIOS REAL EN MYSQL
      // Verificamos si este usuario tiene asignado el rol 'super-admin' en la tabla puente
      // =========================================================================
      const hasAdminRole = await UserCompanyRoleModel.findOne({
        where: { userId, subscriptionId },
        include: [{
          model: RoleModel,
          where: { name: 'super-admin' } // 🔥 Filtro estricto: El nombre del rol debe ser super-admin
        }]
      });

      if (!hasAdminRole) {
        return res.status(403).json({ 
          status: "fail", 
          message: "Acceso denegado. Requiere privilegios administrativos maestros de Dueño del Ecosistema." 
        });
      }
      // =========================================================================

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await this.adminSubscriptionsUseCase.listAllSubscriptions(page, limit);
      return res.status(200).json({ status: "success", data: result });
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  // 📡 POST /api/admin/subscriptions/:id/resend-welcome
  async triggerResendWelcome(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const subscriptionId = req.user?.subscriptionId;

      if (!userId || !subscriptionId) {
        return res.status(401).json({ status: "fail", message: "Sesión corrupta o expirada." });
      }

      // 🛡️ Validamos los mismos candados de ciberseguridad para el reenvío de correo
      const hasAdminRole = await UserCompanyRoleModel.findOne({
        where: { userId, subscriptionId },
        include: [{ model: RoleModel, where: { name: 'super-admin' } }]
      });

      if (!hasAdminRole) {
        return res.status(403).json({ status: "fail", message: "Acceso denegado. Operación de Backoffice restringida." });
      }

      const targetSubscriptionId = parseInt(req.params.id);
      if (isNaN(targetSubscriptionId)) {
        return res.status(400).json({ status: "fail", message: "ID de suscripción corrupto o inválido." });
      }

      const result = await this.adminSubscriptionsUseCase.resendSubscriptionWelcome(targetSubscriptionId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }
}