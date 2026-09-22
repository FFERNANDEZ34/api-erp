import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { GetKardexSummaryUseCase } from '../../../application/use-cases/kardex/get-kardex-summary';
import { GetProductMovementsUseCase } from '../../../application/use-cases/kardex/get-product-movements';
import { StockEntryUseCase } from '../../../application/use-cases/kardex/stock-entry'; 


export class KardexController {
  constructor(
    private readonly getKardexSummaryUseCase: GetKardexSummaryUseCase,
    private readonly getProductMovementsUseCase: GetProductMovementsUseCase,
    private readonly stockEntryUseCase: StockEntryUseCase
  ) {}


  async registerIngress(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const userId = req.user?.id;
      const companyId = parseInt(req.headers['x-company-id'] as string);
      const branchId = parseInt(req.headers['x-branch-id'] as string || req.query.branchId as string);

      if (!subscriptionId || !userId || isNaN(companyId) || isNaN(branchId)) {
        return res.status(401).json({
          status: "fail",
          message: "Contexto transaccional inválido para operaciones de almacén."
        });
      }

      // Consumimos el caso de uso transaccional de forma tipada
      const result = await this.stockEntryUseCase.execute({
        subscriptionId,
        companyId,
        branchId,
        userId,
        sourceDocument: req.body.sourceDocument,
        reason: req.body.reason || 'COMPRA',
        items: req.body.items // Array de objetos { productId, quantity, purchasePrice }
      });

      return res.status(201).json({
        status: "success",
        ...result
      });

    } catch (error: any) {
      console.error('🚨 [ERROR CONTROLADO INGRESS KARDEX]:', error.message);
      return res.status(400).json({
        status: "fail",
        message: error.message || "Error al procesar el ingreso de mercadería a la base de datos."
      });
    }
  }


  // 📊 API 1: Resumen General de Almacén con Alertas Rojas (GET /kardex/summary)
  async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyId = parseInt(req.headers['x-company-id'] as string);
      const search = req.query.search as string;

      if (!subscriptionId || isNaN(companyId)) {
        return res.status(401).json({ status: "fail", message: "Identificación de holding multi-tenant inválida." });
      }

      const result = await this.getKardexSummaryUseCase.execute({ subscriptionId, companyId, search });
      return res.status(200).json({ status: "success", data: result });
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message || "Error al compilar saldos logísticos." });
    }
  }

  // 🕵️‍♂️ API 2: Historial de Movimientos por Ítem y Almacén (GET /kardex/movements/:productId)
  async getMovements(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyId = parseInt(req.headers['x-company-id'] as string);
      const productId = parseInt(req.params.productId);
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;

      if (!subscriptionId || isNaN(companyId) || isNaN(productId)) {
        return res.status(400).json({ status: "fail", message: "Parámetros de auditoría logística corruptos." });
      }

      const result = await this.getProductMovementsUseCase.execute({ subscriptionId, companyId, productId, branchId });
      return res.status(200).json({ status: "success", data: result });
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message || "Error al extraer la trazabilidad del Kardex." });
    }
  }
}