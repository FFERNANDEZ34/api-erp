import { UserModel } from '../../../infrastructure/database/models/user.model';
import { UserCompanyRoleModel } from '../../../infrastructure/database/models/user-company-role.model';
import { CompanyModel } from '../../../infrastructure/database/models/company.model';
import { BranchWarehouseModel } from '../../../infrastructure/database/models/branch-warehouse.model';
import { RoleModel } from '../../../infrastructure/database/models/role.model';

export class GetUsersUseCase {
  async execute(subscriptionId: number, page: number = 1, limit: number = 10, search: string = '') {
    const offset = (page - 1) * limit;
    console.log(`🕵️‍♂️ [PAGINACIÓN] Cargando Página: ${page} | Límite: ${limit} | Filtro: "${search}"`);

    // Construcción del filtro WHERE defensivo: Sólo cuentas activas (Baja lógica)
    const userWhereCondition: any = { subscriptionId, isActive: true };
    
    if (search.trim().length > 0) {
      const { Op } = require('sequelize');
      userWhereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await UserModel.findAndCountAll({
      where: userWhereCondition,
      attributes: ['id', 'email', 'name', 'phone', 'address', 'isEmailConfirmed', 'mustChangePassword', 'createdAt'],
      order: [['id', 'DESC']],
      limit,
      offset,
      raw: true
    });

    const assignments = await UserCompanyRoleModel.findAll({
      where: { subscriptionId },
      include: [
        { model: CompanyModel, attributes: ['name'] },
        { model: BranchWarehouseModel, attributes: ['name'] },
        { model: RoleModel, attributes: ['name'] }
      ],
      raw: true,
      nest: true
    });

    const rowsWithAssignments = rows.map((u: any) => {
      const userAssignments = assignments.filter((a: any) => a.userId === u.id);
      return {
        ...u,
        assignments: userAssignments.map((a: any) => ({
          companyId: a.companyId,
          companyName: a.CompanyModel?.name || 'Empresa',
          branchId: a.branchId,
          branchName: a.BranchWarehouseModel?.name || 'Local',
          roleName: a.RoleModel?.name || 'Rol'
        }))
      };
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      itemsPerPage: limit,
      rows: rowsWithAssignments
    };
  }
}