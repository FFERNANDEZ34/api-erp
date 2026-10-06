import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../middlewares/async-handler.middleware';

const adminRouter = Router();
const adminController = new AdminController();

// 🔒 Candado central de autenticación JWT obligatoria
adminRouter.use(authMiddleware);

// Arteria A: Panel de control de clientes globales
adminRouter.get('/subscriptions', catchAsync((req: any, res: any) => adminController.getAllTenants(req, res)));

// 🎯 ARTERIA B: TU REENVÍO DE EMERGENCIA DE CORREOS SANEADO POR TLS
adminRouter.post('/subscriptions/:id/resend-welcome', catchAsync((req: any, res: any) => adminController.triggerResendWelcome(req, res)));

export { adminRouter };