import { CurrencyExchangeModel } from '../../../infrastructure/database/models/currency-exchange.model';
import { Op } from 'sequelize';

export class GetTodayExchangeUseCase {
  async execute(subscriptionId: number) {
    const todayStr = new Date().toISOString().split('T')[0]; // Captura YYYY-MM-DD puro del servidor

    // 1. 🔍 Buscamos si ya registraron el tipo de cambio con fecha de HOY
    // Eliminamos la propiedad isActive para evitar el error de columna desconocida
    let exchange = await CurrencyExchangeModel.findOne({
      where: {
        subscriptionId,
        exchangeDate: todayStr
      },
      raw: true
    });

    // 2. 🛡️ PLAN DE RESILIENCIA: Si no hay tipo de cambio hoy, jalamos el último registrado hacia atrás
    if (!exchange) {
      exchange = await CurrencyExchangeModel.findOne({
        where: {
          subscriptionId,
          exchangeDate: { [Op.lte]: todayStr } // Menor o igual a hoy
        },
        order: [['exchangeDate', 'DESC']], // Trae el más cercano en el tiempo
        raw: true
      });
    }

    // 3. Fallback de emergencia absoluto por si la tabla de finanzas está vacía
    if (!exchange) {
      return {
        purchasePrice: 3.7000,
        salePrice: 3.7500,
        exchangeDate: todayStr,
        isFallback: true
      };
    }

    return exchange;
  }
}