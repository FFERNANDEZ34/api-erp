import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";
import { CompanyModel } from './company.model';
import { BranchWarehouseModel } from './branch-warehouse.model';
import { RoleModel } from './role.model';


export class UserCompanyRoleModel extends Model {
  // 🌟 EL BLINDAJE DE TYPESCRIPT: Usamos declare para limpiar la sombra de atributos
  declare public id: number;
  declare public userId: number;
  declare public companyId: number;
  declare public roleId: number;
  declare public isDefault: boolean; // 👈 ¡EL AJUSTE CLAVE AQUÍ!
}

UserCompanyRoleModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    roleId: { type: DataTypes.INTEGER, allowNull: false },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize: sequelizeInstance,
    tableName: "user_company_roles",
    timestamps: true,
  },
);

UserCompanyRoleModel.belongsTo(CompanyModel, { foreignKey: 'companyId' });
UserCompanyRoleModel.belongsTo(BranchWarehouseModel, { foreignKey: 'branchId' }); 
UserCompanyRoleModel.belongsTo(RoleModel, { foreignKey: 'roleId' });