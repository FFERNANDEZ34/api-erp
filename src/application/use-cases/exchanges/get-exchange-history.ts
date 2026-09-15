import { CurrencyExchangeModel } from '../../../infrastructure/database/models/currency-exchange.model';
import { Op } from 'sequelize';

export class GetExchangeHistoryUseCase {
  async execute(params: { subscriptionId: number; startDate?: string; endDate?: string }) {
    const { subscriptionId, startDate, endDate } = params;

    const whereClause: any = { subscriptionId };

    // Si el usuario filtra por rango de fechas en la interfaz de reportes
    if (startDate && endDate) {
      whereClause.exchangeDate = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      whereClause.exchangeDate = { [Op.gte]: startDate };
    } else if (endDate) {
      whereClause.exchangeDate = { [Op.lte]: endDate };
    }

    // Jalamos los históricos ordenados desde el día más reciente hacia atrás
    const history = await CurrencyExchangeModel.findAll({
      where: whereClause,
      order: [['exchangeDate', 'DESC'], ['currencyCode', 'ASC']],
      raw: true
    });

    return history;
  }
}