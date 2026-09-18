import { Router } from 'express';
import { ExchangeController } from '../controllers/exchange.controller';
import { SaveDailyExchangeUseCase } from '../../../application/use-cases/exchanges/save-daily-exchange';
import { GetExchangeHistoryUseCase } from '../../../application/use-cases/exchanges/get-exchange-history';
import { GetTodayExchangeUseCase } from '../../../application/use-cases/exchanges/get-today-exchange';
import { authMiddleware } from '../../middlewares/auth.middleware';

const exchangeRouter = Router();

const saveDailyExchangeUseCase = new SaveDailyExchangeUseCase();
const getExchangeHistoryUseCase = new GetExchangeHistoryUseCase();
const getTodayExchangeUseCase = new GetTodayExchangeUseCase();


const exchangeController = new ExchangeController(
  saveDailyExchangeUseCase,
  getExchangeHistoryUseCase,
  getTodayExchangeUseCase
);

// Enganches físicos protegidos por JWT
exchangeRouter.post('/', authMiddleware, (req: any, res: any) => exchangeController.saveDaily(req, res));
exchangeRouter.get('/history', authMiddleware, (req: any, res: any) => exchangeController.getHistory(req, res));
exchangeRouter.get('/today', authMiddleware, (req: any, res: any) => exchangeController.getToday(req, res));
export { exchangeRouter };