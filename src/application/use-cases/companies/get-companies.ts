import { CompanyModel } from '../../../infrastructure/database/models/company.model';
import { Op, OrderItem } from 'sequelize';

export interface CompanyFilters {
  name?: string;
  ruc?: string;
}

export class GetCompaniesUseCase {
  async execute(params: {
    subscriptionId: number;
    page: number;
    limit: number;
    filters: CompanyFilters;
    sortInput: { field?: string; order?: string };
  }) {
    const sanitizedPage = params.page < 1 ? 1 : params.page;
    const sanitizedLimit = params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // 🔒 Cortafuegos SaaS: Solo jala compañías activas pertenecientes a tu Holding
    const whereClause: any = {
      subscriptionId: params.subscriptionId,
      isActive: true 
    };

    if (params.filters.name?.trim()) {
      whereClause.name = { [Op.like]: `%${params.filters.name.trim()}%` };
    }
    if (params.filters.ruc?.trim()) {
      whereClause.ruc = { [Op.like]: `%${params.filters.ruc.trim()}%` };
    }

    const allowedFields = ['id', 'name', 'ruc', 'createdAt'];
    const field = allowedFields.includes(params.sortInput.field || '') ? params.sortInput.field : 'id';
    const order = params.sortInput.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const { rows, count } = await CompanyModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [[field, order]] as OrderItem[],
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