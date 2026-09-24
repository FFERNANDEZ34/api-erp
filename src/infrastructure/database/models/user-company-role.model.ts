import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";
import { CompanyModel } from './company.model';
import { BranchWarehouseModel } from './branch-warehouse.model';
import { RoleModel } from './role.model';

export class UserCompanyRoleModel extends Model {
  // 🌟 EL BLINDAJE DE TYPESCRIPT COMPLETO SINCRO
  declare public id: number;
  declare public subscriptionId: number; // 🚀 MAQUEADO AQUÍ
  declare public userId: number;
  declare public companyId: number;
  declare public branchId: number;      // 🚀 MAQUEADO AQUÍ
  declare public roleId: number;
  declare public isDefault: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

UserCompanyRoleModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false }, // 🎯 Sincronizado a tu MySQL
    userId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    branchId: { type: DataTypes.INTEGER, allowNull: false },       // 🎯 Sincronizado a tu MySQL
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
    timestamps: true, // Lee automáticamente createdAt y updatedAt
  },
);

UserCompanyRoleModel.belongsTo(CompanyModel, { foreignKey: 'companyId' });
UserCompanyRoleModel.belongsTo(BranchWarehouseModel, { foreignKey: 'branchId' }); 
UserCompanyRoleModel.belongsTo(RoleModel, { foreignKey: 'roleId' });