import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";
import { RoleModel } from "./role.model";
import { CompanyModel } from "./company.model";
import { BranchWarehouseModel } from "./branch-warehouse.model";

export class UserCompanyRoleModel extends Model {
  declare id: number;
  declare subscriptionId: number;
  declare userId: number;
  declare companyId: number;
  declare branchId: number;
  declare roleId: number;
  public isDefault!: number;
}

UserCompanyRoleModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    branchId: { type: DataTypes.INTEGER, allowNull: false }, // 👈 Agregado
    roleId: { type: DataTypes.INTEGER, allowNull: false },
    isDefault: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      field: "isDefault", // 💡 Ponle 'is_default' si en tu MySQL la columna usa guión bajo
    },
  },
  {
    sequelize: sequelizeInstance,
    tableName: "user_company_roles",
    timestamps: true,
  },
);

// Relaciones para las consultas con .findAll y Login
UserCompanyRoleModel.belongsTo(RoleModel, { foreignKey: "roleId" });
UserCompanyRoleModel.belongsTo(CompanyModel, { foreignKey: "companyId" });
UserCompanyRoleModel.belongsTo(BranchWarehouseModel, {
  foreignKey: "branchId",
});
