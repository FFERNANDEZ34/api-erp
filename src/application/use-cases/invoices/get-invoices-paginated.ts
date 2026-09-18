import { InvoiceHeaderModel } from '../../../infrastructure/database/models/invoice-header.model';
import { Op, OrderItem } from 'sequelize';

export interface InvoiceFilters {
  documentType?: string;    // 'FACTURA', 'BOLETA', 'NOTA_PEDIDO'
  fullDocumentNumber?: string; // 'F001-00000024'
  customerName?: string;
  customerIdentityNumber?: string;
}

export class GetInvoicesPaginatedUseCase {
  async execute(params: {
    subscriptionId: number;
    companyId: number; // 🔒 Candado de segmentación corporativa
    page: number;
    limit: number;
    filters: InvoiceFilters;
  }) {
    const sanitizedPage = params.page < 1 ? 1 : params.page;
    const sanitizedLimit = params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // Aislamos las ventas de tu holding y de la empresa seleccionada en el combo de Angular
    const whereClause: any = {
      subscriptionId: params.subscriptionId,
      companyId: params.companyId
    };

    if (params.filters.documentType) {
      whereClause.documentType = params.filters.documentType.toUpperCase();
    }
    if (params.filters.fullDocumentNumber?.trim()) {
      whereClause.fullDocumentNumber = { [Op.like]: `%${params.filters.fullDocumentNumber.trim()}%` };
    }
    if (params.filters.customerName?.trim()) {
      whereClause.customerName = { [Op.like]: `%${params.filters.customerName.trim()}%` };
    }
    if (params.filters.customerIdentityNumber?.trim()) {
      whereClause.customerIdentityNumber = params.filters.customerIdentityNumber.trim();
    }

    const { rows, count } = await InvoiceHeaderModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [['id', 'DESC']], // Las ventas más recientes siempre se muestran arriba
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