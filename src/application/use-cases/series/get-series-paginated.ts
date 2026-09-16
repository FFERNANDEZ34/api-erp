import { DocumentSeriesModel } from '../../../infrastructure/database/models/document-series.model';
import { Op, OrderItem } from 'sequelize';

export interface SeriesFilters {
  documentType?: string;
  series?: string;
}

export class GetSeriesPaginatedUseCase {
  async execute(params: {
    subscriptionId: number;
    companyId: number; // 🔒 Candado de segmentación por empresa activa
    page: number;
    limit: number;
    filters: SeriesFilters;
  }) {
    const sanitizedPage = params.page < 1 ? 1 : params.page;
    const sanitizedLimit = params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    const whereClause: any = {
      subscriptionId: params.subscriptionId,
      companyId: params.companyId,
      isActive: true // 💥 Baja Lógica Obligatoria: Excluye los talonarios eliminados
    };

    if (params.filters.documentType?.trim()) {
      whereClause.documentType = params.filters.documentType.trim().toUpperCase();
    }
    if (params.filters.series?.trim()) {
      whereClause.series = { [Op.like]: `%${params.filters.series.trim().toUpperCase()}%` };
    }

    const { rows, count } = await DocumentSeriesModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [['documentType', 'ASC'], ['series', 'ASC']] as OrderItem[],
      raw: true
    });

    return {
      data: rows,
      total: count,
      page: sanitizedPage,
      limit: sanitizedLimit
    };
  }
}