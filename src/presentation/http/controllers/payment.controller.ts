import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { RegisterPaymentsUseCase } from '../../../application/use-cases/payments/register-payments';

export class PaymentController {
  constructor(
    private readonly registerPaymentsUseCase: RegisterPaymentsUseCase
  ) {}

  // 📥 API ATÓMICA: Registrar Lote de Pagos Divididos con Voucher (POST /payments)
  async createPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const userId = req.user?.id; // 🎯 TRAZABILIDAD MAESTRA: El usuario que cobra queda sellado desde el Token JWT
      const companyId = parseInt(req.headers['x-company-id'] as string);
      const branchId = parseInt(req.headers['x-branch-id'] as string);

      if (!subscriptionId || !userId || isNaN(companyId) || isNaN(branchId)) {
        return res.status(401).json({
          status: "fail",
          message: "Contexto de sesión, holding o sucursal multi-tenant inválido."
        });
      }

      // Al viajar por Multer (Multipart Form-Data), el JSON de pagos divididos llega como texto string
      // Procedemos a deserializarlo en la memoria RAM de forma inmediata
      let parsedPayments = [];
      try {
        parsedPayments = typeof req.body.payments === 'string' ? JSON.parse(req.body.payments) : req.body.payments;
      } catch (e) {
        throw new Error('El formato de la matriz de pagos divididos es inválido o ilegible.');
      }

      const invoiceHeaderId = parseInt(req.body.invoiceHeaderId);
      if (isNaN(invoiceHeaderId)) throw new Error('Debe especificar un ID de factura válido para aplicar el cobro.');

      // 📸 CAPTURA DE VOUCHER FISICO EN DISCO:
      // Si el cajero adjuntó una foto o un PDF, guardamos su ruta de acceso relativa para auditorías
      let finalEvidencePath: string | null = null;
      if (req.file) {
        finalEvidencePath = `uploads/vouchers/${req.file.filename}`;
        console.log(`📸 RADAR TESORERÍA - Evidencia de pago adjuntada con éxito en: [${finalEvidencePath}]`);
      }

      // Calibramos la matriz inyectando de forma inteligente la evidencia solo a medios bancarios/digitales
      const calibratedPayments = parsedPayments.map((p: any) => ({
        paymentMethod: p.paymentMethod,
        amountPaid: Number(p.amountPaid || 0),
        amountReceived: Number(p.amountReceived || p.amountPaid || 0),
        cashChange: Number(p.cashChange || 0),
        transactionNumber: p.transactionNumber || null,
        evidencePath: p.paymentMethod !== 'EFECTIVO' ? finalEvidencePath : null // El efectivo no lleva voucher adjunto
      }));

      // Despachamos con autoridad financiera absoluta hacia nuestro Caso de Uso ACID
      const result = await this.registerPaymentsUseCase.execute({
        subscriptionId,
        companyId,
        branchId,
        userId, // Trazabilidad contable blindada
        invoiceHeaderId,
        payments: calibratedPayments
      });

      return res.status(201).json({
        status: "success",
        ...result
      });

    } catch (error: any) {
      console.error('🚨 [ERROR CONTROLADO EN CONTROLADOR DE PAGOS]:', error.message);
      return res.status(400).json({
        status: "fail",
        message: error.message || "Error al procesar la recaudación en la caja del holding."
      });
    }
  }
}