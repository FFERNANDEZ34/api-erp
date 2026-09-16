import { Router } from "express";
import { SeriesController } from "../controllers/series.controller";
import { CreateSeriesUseCase } from "../../../application/use-cases/series/create-series";
import { GetSeriesPaginatedUseCase } from "../../../application/use-cases/series/get-series-paginated";
import { UpdateSeriesUseCase } from "../../../application/use-cases/series/update-series";
import { DeleteSeriesUseCase } from "../../../application/use-cases/series/delete-series";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { checkExchangeRateMiddleware } from "../../middlewares/check-exchange-rate.middleware";

const seriesRouter = Router();

const createSeriesUseCase = new CreateSeriesUseCase();
const getSeriesPaginatedUseCase = new GetSeriesPaginatedUseCase();
const updateSeriesUseCase = new UpdateSeriesUseCase();
const deleteSeriesUseCase = new DeleteSeriesUseCase();

const seriesController = new SeriesController(
  createSeriesUseCase,
  getSeriesPaginatedUseCase,
  updateSeriesUseCase,
  deleteSeriesUseCase
);

// Mapeado físico de Endpoints blindados por Sesión y Candado de Tipo de Cambio Diario
seriesRouter.post("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => seriesController.create(req, res));
seriesRouter.get("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => seriesController.getPaginated(req, res));
seriesRouter.put("/:id", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => seriesController.update(req, res));
seriesRouter.delete("/:id", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => seriesController.delete(req, res));

export { seriesRouter };