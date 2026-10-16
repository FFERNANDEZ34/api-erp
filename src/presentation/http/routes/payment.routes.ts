import { Router } from 'express';
import { RegisterPaymentsUseCase } from '../../../application/use-cases/payments/register-payments';
import { PaymentController } from '../controllers/payment.controller';

// 🎯 Middlewares nativos de tu capa de presentación
import { uploadVoucherMiddleware } from '../../middlewares/upload.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../middlewares/async-handler.middleware';

// 🎯 ÚNICA IMPORTACIÓN DE INFRAESTRUCTURA FISCAL REQUERIDA:
import { SunatOrchestratorService } from "../../../infrastructure/services/sunat-orchestrator.service";

const paymentRouter = Router();

// Bloqueamos la arteria completa de pagos bajo el middleware de sesión JWT del ERP
paymentRouter.use(authMiddleware);

// =========================================================================
// 🎯 INVERSIÓN DE DEPENDENCIAS EN CASCADA (Clean Architecture)
// Instanciamos únicamente el nuevo orquestador conectado a .NET 9
// =========================================================================
const sunatOrchestratorService = new SunatOrchestratorService();
const registerPaymentsUseCase = new RegisterPaymentsUseCase(sunatOrchestratorService);
const paymentController = new PaymentController(registerPaymentsUseCase);

// 📥 API ATÓMICA: Captura Multipart con Multer y despacha la recaudación
paymentRouter.post(
  '/', 
  uploadVoucherMiddleware.single('evidenceFile'), 
  catchAsync((req: any, res: any) => paymentController.createPayment(req, res))
);

export { paymentRouter };