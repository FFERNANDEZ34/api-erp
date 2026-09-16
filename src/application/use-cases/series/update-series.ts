import { DocumentSeriesModel } from '../../../infrastructure/database/models/document-series.model';

export class UpdateSeriesUseCase {
  async execute(seriesId: number, subscriptionId: number, data: any) {
    const targetSeries = await DocumentSeriesModel.findOne({
      where: { id: seriesId, subscriptionId }
    });

    if (!targetSeries) {
      throw new Error('El talonario o serie solicitado no existe en su holding corporativo.');
    }

    // Si intentan modificar la numeración actual, aseguramos el casteo estricto a número
    if (data.currentNumber !== undefined) {
      data.currentNumber = Number(data.currentNumber);
      if (data.currentNumber < 0) {
        throw new Error('El contador correlativo del talonario no puede ser inferior a cero.');
      }
    }

    // Bloqueamos la mutación directa de la serie o tipo de documento si ya nació, para proteger la integridad histórica
    delete data.series;
    delete data.documentType;
    delete data.companyId;

    await targetSeries.update(data);
    return targetSeries.get({ plain: true });
  }
}