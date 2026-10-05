import { RoleModel } from '../../../infrastructure/database/models/role.model';
import { Op } from 'sequelize';

export class GetRolesUseCase {
  async execute(subscriptionId: number, companyId: number, page: number = 1, limit: number = 10, search: string = '') {
    const offset = (page - 1) * limit;
    
    // 🔒 AISLAMIENTO MULTI-TENANT QUIRÚRGICO: Filtramos estrictamente por la empresa en la que trabaja
    const whereCondition: any = { subscriptionId, companyId, isActive: true };

    if (search.trim().length > 0) {
      whereCondition.name = { [Op.like]: `%${search.trim().toLowerCase()}%` };
    }

    const { rows, count } = await RoleModel.findAndCountAll({
      where: whereCondition,
      order: [['id', 'DESC']],
      limit,
      offset,
      raw: true
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      itemsPerPage: limit,
      rows: rows.map(r => ({ ...r, name: r.name.toUpperCase() }))
    };
  }
}