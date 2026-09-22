import { Router } from "express";
import { GetKardexSummaryUseCase } from "../../../application/use-cases/kardex/get-kardex-summary";
import { GetProductMovementsUseCase } from "../../../application/use-cases/kardex/get-product-movements";
import { KardexController } from "../controllers/kardex.controller";
import { StockEntryUseCase } from "../../../application/use-cases/kardex/stock-entry"; // 🚀 IMPORTA AQUÍ

import { authMiddleware } from "../../middlewares/auth.middleware";
import { catchAsync } from "../../middlewares/async-handler.middleware";

const kardexRouter = Router();

// Instanciamos la suite logistica pura
const getKardexSummaryUseCase = new GetKardexSummaryUseCase();
const getProductMovementsUseCase = new GetProductMovementsUseCase();
const stockEntryUseCase = new StockEntryUseCase();
const kardexController = new KardexController(
  getKardexSummaryUseCase,
  getProductMovementsUseCase,
  stockEntryUseCase,
);

// Blindamos el enrutador con el token de sesión activa del holding
kardexRouter.use(authMiddleware);

kardexRouter.get(
  "/summary",
  catchAsync((req: any, res: any) => kardexController.getSummary(req, res)),
);
kardexRouter.get(
  "/movements/:productId",
  catchAsync((req: any, res: any) => kardexController.getMovements(req, res)),
);


kardexRouter.post('/ingress', catchAsync((req: any, res: any) => kardexController.registerIngress(req, res)));

export { kardexRouter };
