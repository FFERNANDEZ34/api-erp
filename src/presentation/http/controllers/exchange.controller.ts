import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { SaveDailyExchangeUseCase } from '../../../application/use-cases/exchanges/save-daily-exchange';
import { GetExchangeHistoryUseCase } from '../../../application/use-cases/exchanges/get-exchange-history';
import { GetTodayExchangeUseCase } from '../../../application/use-cases/exchanges/get-today-exchange';
import { z } from 'zod';

export class ExchangeController {
  constructor(
    private readonly saveDailyExchangeUseCase: SaveDailyExchangeUseCase,
    private readonly getExchangeHistoryUseCase: GetExchangeHistoryUseCase,
    private readonly getTodayExchangeUseCase: GetTodayExchangeUseCase,
  ) {}

  async getToday(req: AuthenticatedRequest, res: Response) {
    try {
      // Extraemos el candado SaaS obligatorio desde el middleware de sesión
      const subscriptionId = req.user?.subscriptionId;

      if (!subscriptionId) {
        return res.status(401).json({ 
          status: 'fail', 
          message: 'Acceso denegado: Sesión SaaS multi-tenant no válida.' 
        });
      }

      // Instanciamos el caso de uso de la capa de aplicación
      const getTodayExchangeUseCase = new GetTodayExchangeUseCase();
      const exchangeData = await getTodayExchangeUseCase.execute(subscriptionId);

      // Despachamos la respuesta con éxito total (HTTP 200)
      return res.status(200).json({
        status: 'success',
        message: 'Tipo de cambio diario recuperado con éxito de MySQL.',
        data: exchangeData
      });

    } catch (error: any) {
      // Captura defensiva ante caídas imprevistas de base de datos
      return res.status(500).json({ 
        status: 'error', 
        message: `Error interno en el servidor: ${error.message}` 
      });
    }
  }
  
  // 💾 GUARDAR O ACTUALIZAR LA MATRIZ DEL DÍA (POST)
  async saveDaily(req: AuthenticatedRequest, res: Response) {
    const exchangeSchema = z.object({
      exchangeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (Debe ser YYYY-MM-DD)."),
      rates: z.array(
        z.object({
          currencyParamId: z.number().int(),
          currencyCode: z.string().min(3).max(10),
          buyPrice: z.number().positive("El precio de compra debe ser mayor a cero."),
          sellPrice: z.number().positive("El precio de venta debe ser mayor a cero.")
        })
      ).min(1, "Debe enviar al menos una tasa de cambio.")
    });

    const body = exchangeSchema.parse(req.body);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) {
      return res.status(401).json({ status: 'fail', message: 'No autorizado: Suscripción SaaS nula.' });
    }

    const result = await this.saveDailyExchangeUseCase.execute({
      subscriptionId,
      exchangeDate: body.exchangeDate,
      rates: body.rates
    });

    return res.status(200).json({
      status: 'success',
      message: 'Matriz de tipo de cambio diario guardada correctamente.',
      data: result
    });
  }

  // 🔎 CONSULTAR HISTÓRICOS CRONOLÓGICOS (GET)
  async getHistory(req: AuthenticatedRequest, res: Response) {
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) {
      return res.status(401).json({ status: 'fail', message: 'Suscripción no válida.' });
    }

    const { startDate, endDate } = req.query;

    const history = await this.getExchangeHistoryUseCase.execute({
      subscriptionId,
      startDate: startDate as string,
      endDate: endDate as string
    });

    return res.status(200).json({
      status: 'success',
      data: history
    });
  }
}