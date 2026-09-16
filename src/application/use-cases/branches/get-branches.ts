import { BranchWarehouseModel } from '../../../infrastructure/database/models/branch-warehouse.model';
import { CompanyModel } from '../../../infrastructure/database/models/company.model';
import { Op, OrderItem } from 'sequelize';

export interface BranchFilters {
  name?: string;
  companyId?: number;
}

export class GetBranchesUseCase {
  async execute(params: {
    subscriptionId: number;
    page: number;
    limit: number;
    filters: BranchFilters;
    sortInput: { field?: string; order?: string };
  }) {
    const sanitizedPage = params.page < 1 ? 1 : params.page;
    const sanitizedLimit = params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    const whereClause: any = {
      subscriptionId: params.subscriptionId,
      isActive: true
    };

    if (params.filters.name?.trim()) {
      whereClause.name = { [Op.like]: `%${params.filters.name.trim()}%` };
    }
    if (params.filters.companyId) {
      whereClause.companyId = params.filters.companyId;
    }

    const allowedFields = ['id', 'name', 'createdAt'];
    const field = allowedFields.includes(params.sortInput.field || '') ? params.sortInput.field : 'id';
    const order = params.sortInput.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const { rows, count } = await BranchWarehouseModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [[field, order]] as OrderItem[],
      include: [
        { model: CompanyModel, as: 'Company', attributes: ['id', 'name', 'ruc'] },
        { model: BranchWarehouseModel, as: 'DefaultWarehouse', attributes: ['id', 'name'] }
      ]
    });

    return {
      data: rows.map(r => r.toJSON()),
      total: count,
      page: sanitizedPage,
      limit: sanitizedLimit
    };
  }
}