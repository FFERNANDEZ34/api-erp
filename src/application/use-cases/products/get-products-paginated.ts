import { ProductModel } from '../../../infrastructure/database/models/product.model';
import { AuxiliaryParameterModel } from '../../../infrastructure/database/models/auxiliary-parameter.model';
import { Op, OrderItem } from 'sequelize';

export interface ProductFilters {
  name?: string;
  productCode?: string;
  categoryId?: number;
}

export class GetProductsPaginatedUseCase {
  async execute(params: {
    subscriptionId: number;
    companyId: number; // 👈 AJUSTE COMPAÑÍA: Recibe el ID de la cabecera de Angular
    page: number;
    limit: number;
    filters: ProductFilters;
    sortInput: { field?: string; order?: string };
  }) {
    const sanitizedPage = params.page < 1 ? 1 : params.page;
    const sanitizedLimit = params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // 🛡️ AISLAMIENTO SAAS CORPORATIVO DOBLE CAPA (Suscripción + Compañía Activa)
    const whereClause: any = {
      subscriptionId: params.subscriptionId,
      companyId: params.companyId, // 🔒 CORTAFUEGOS EN CALIENTE: Aísla el inventario de este holding
      isActive: true
    };

    if (params.filters.name?.trim()) {
      whereClause.name = { [Op.like]: `%${params.filters.name.trim()}%` };
    }
    if (params.filters.productCode?.trim()) {
      whereClause.productCode = { [Op.like]: `%${params.filters.productCode.trim()}%` };
    }
    if (params.filters.categoryId) {
      whereClause.categoryId = params.filters.categoryId;
    }

    const allowedFields = ['id', 'name', 'productCode', 'salesPrice', 'createdAt'];
    const field = allowedFields.includes(params.sortInput.field || '') ? params.sortInput.field : 'id';
    const order = params.sortInput.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const { rows, count } = await ProductModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [[field, order]] as OrderItem[],
      include: [
        { model: AuxiliaryParameterModel, as: 'Category', attributes: ['id', 'code', 'name'] },
        { model: AuxiliaryParameterModel, as: 'Brand', attributes: ['id', 'code', 'name'] },
        { model: AuxiliaryParameterModel, as: 'Currency', attributes: ['id', 'code', 'name'] }
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