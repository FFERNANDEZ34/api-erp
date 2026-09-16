import { DocumentSeriesModel } from '../../../infrastructure/database/models/document-series.model';

export class DeleteSeriesUseCase {
  async execute(seriesId: number, subscriptionId: number): Promise<void> {
    const targetSeries = await DocumentSeriesModel.findOne({
      where: { id: seriesId, subscriptionId }
    });

    if (!targetSeries) {
      throw new Error('El talonario de series que intenta dar de baja no existe.');
    }

    // 🔒 Inactivación por flag de control
    await targetSeries.update({ isActive: false });
  }
}