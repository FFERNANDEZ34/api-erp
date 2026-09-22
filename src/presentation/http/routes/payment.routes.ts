import { Router } from 'express';
import { RegisterPaymentsUseCase } from '../../../application/use-cases/payments/register-payments';
import { PaymentController } from '../controllers/payment.controller';

// 🎯 IMPORTACIONES CORREGIDAS: Jalamos los middlewares desde su carpeta real en presentation
import { uploadVoucherMiddleware } from '../../middlewares/upload.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';

import { catchAsync } from '../../middlewares/async-handler.middleware'; // Ajusta según tu async-handler

const paymentRouter = Router();

const registerPaymentsUseCase = new RegisterPaymentsUseCase();
const paymentController = new PaymentController(registerPaymentsUseCase);

paymentRouter.use(authMiddleware);

// Inyección atómica del capturador de archivos Multer en la arteria de red
paymentRouter.post(
  '/', 
  uploadVoucherMiddleware.single('evidenceFile'), 
  catchAsync((req: any, res: any) => paymentController.createPayment(req, res))
);

export { paymentRouter };