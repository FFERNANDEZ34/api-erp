import { CurrencyExchangeModel } from '../../../infrastructure/database/models/currency-exchange.model';
import { AuxiliaryParameterModel } from '../../../infrastructure/database/models/auxiliary-parameter.model';

export interface ExchangeRateInput {
  currencyParamId: number;
  currencyCode: string;
  buyPrice: number;
  sellPrice: number;
}

export class SaveDailyExchangeUseCase {
  async execute(params: { subscriptionId: number; exchangeDate: string; rates: ExchangeRateInput[] }) {
    const { subscriptionId, exchangeDate, rates } = params;

    if (!rates || rates.length === 0) {
      throw new Error('Debe proporcionar al menos una cotización de divisa para guardar.');
    }

    const savedRecords = [];

    // Procesamos en bucle cada moneda extranjera enviada desde la matriz del frontend
    for (const rate of rates) {
      // 1. Validar que la moneda extranjera exista legítimamente en el catálogo paramétrico
      const paramExists = await AuxiliaryParameterModel.findOne({
        where: { id: rate.currencyParamId, subscriptionId, parameterType: 'MONEDA' },
        raw: true
      });

      if (!paramExists) {
        throw new Error(`La divisa con ID ${rate.currencyParamId} no es válida para su holding.`);
      }

      // 2. 🚀 OPERACIÓN UPSERT ATÓMICA: Buscamos si ya existe registro para esa fecha y moneda
      const [record, created] = await CurrencyExchangeModel.findOrCreate({
        where: {
          subscriptionId,
          exchangeDate,
          currencyParamId: rate.currencyParamId
        },
        defaults: {
          currencyCode: rate.currencyCode.toUpperCase().trim(),
          buyPrice: Number(rate.buyPrice),
          sellPrice: Number(rate.sellPrice)
        }
      });

      // Si no fue creado (ya existía), actualizamos sus precios al vuelo
      if (!created) {
        await record.update({
          buyPrice: Number(rate.buyPrice),
          sellPrice: Number(rate.sellPrice)
        });
      }

      await record.reload();
      savedRecords.push(record.get({ plain: true }));
    }

    return savedRecords;
  }
}