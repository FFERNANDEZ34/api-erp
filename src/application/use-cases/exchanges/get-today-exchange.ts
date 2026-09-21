import { CurrencyExchangeModel } from '../../../infrastructure/database/models/currency-exchange.model';
import { Op } from 'sequelize';

export class GetTodayExchangeUseCase {
  async execute(subscriptionId: number) {
    const todayStr = new Date().toISOString().split('T')[0]; // Captura YYYY-MM-DD puro del servidor

    console.log(`=============== 🎰 MOTOR FINANCIERO: EXTRAER TASAS DEL HOLDING [${subscriptionId}] ===============`);

    // 1. 🔍 BUSQUEDA HOY: Intentamos jalar todos los tipos de cambio registrados para la fecha actual
    let currentExchanges = await CurrencyExchangeModel.findAll({
      where: {
        subscriptionId,
        exchangeDate: todayStr
      },
      raw: true
    });

    // 2. 🛡️ PLAN DE RESILIENCIA EN BLOQUE: Si la grilla viene vacía hoy, 
    // buscamos cuál fue la última fecha que registró movimientos cambiarios hacia atrás
    if (!currentExchanges || currentExchanges.length === 0) {
      console.log('➔ No se hallaron tasas hoy. Buscando la última fecha con movimientos hacia atrás...');
      
      const lastExchangeRow = await CurrencyExchangeModel.findOne({
        where: {
          subscriptionId,
          exchangeDate: { [Op.lte]: todayStr }
        },
        order: [['exchangeDate', 'DESC']],
        raw: true
      });

      if (lastExchangeRow) {
        const lastAvailableDate = lastExchangeRow.exchangeDate;
        console.log(`➔ Fecha más cercana recuperada con éxito: [${lastAvailableDate}]`);
        
        // Jalamos todas las divisas amarradas a esa fecha histórica más cercana
        currentExchanges = await CurrencyExchangeModel.findAll({
          where: {
            subscriptionId,
            exchangeDate: lastAvailableDate
          },
          raw: true
        });
      }
    }

    // 3. 🎯 ESTRUCTURACIÓN MAPA: Inicializamos el contenedor unificado con los fallbacks comerciales oficiales
    const summaryPayload = {
      purchasePrice: 3.7000,     // Dólar Compra (Usa purchasePrice para mantener compatibilidad con tu Angular)
      sellPrice: 3.7500,         // Dólar Venta
      euroPurchasePrice: 4.1000, // Euro Compra
      euroSellPrice: 4.6000,     // Euro Venta
      exchangeDate: todayStr,
      isFallback: true
    };

    // Si encontramos registros en disco, barremos las filas y pisamos los valores por sus reales de MySQL
    if (currentExchanges && currentExchanges.length > 0) {
      summaryPayload.isFallback = false;
      summaryPayload.exchangeDate = currentExchanges[0].exchangeDate;

      console.log(`➔ Procesando ${currentExchanges.length} divisas encontradas en disco...`);

      for (const row of currentExchanges) {
        // 🎯 SINCRO DE TU MODELO: Consumimos de forma directa y tipada las columnas buyPrice y sellPrice
        const currencyKey = String(row.currencyCode || '').trim().toUpperCase();
        const compra = Number(row.buyPrice || 0);
        const venta = Number(row.sellPrice || 0);

        if (currencyKey === 'USD') {
          summaryPayload.purchasePrice = compra;
          summaryPayload.sellPrice = venta;
          console.log(`🎰 DÓLAR SINCRONIZADO -> Compra (buyPrice): ${compra} | Venta (sellPrice): ${venta}`);
        } else if (currencyKey === 'EUR') {
          summaryPayload.euroPurchasePrice = compra;
          summaryPayload.euroSellPrice = venta;
          console.log(`🎰 EURO SINCRONIZADO -> Compra (buyPrice): ${compra} | Venta (sellPrice): ${venta}`);
        }
      }
    } else {
      console.warn('⚠️ ALERTA: La tabla de finanzas está completamente vacía. Activando fallbacks del holding.');
    }

    console.log('Payload Cambiario despachado con éxito al POS:', JSON.stringify(summaryPayload, null, 2));
    return summaryPayload;
  }
}