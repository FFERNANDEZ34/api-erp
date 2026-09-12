import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";

export class BranchWarehouseModel extends Model {
  declare id: number;
  declare subscriptionId: number;
  declare companyId: number;
  declare name: string;
  declare address: string | null;
  declare isPointOfSale: boolean;
  declare isWarehouse: boolean;
}

BranchWarehouseModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: true },
    isPointOfSale: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isWarehouse: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize: sequelizeInstance,
    tableName: "branches_warehouses",
    timestamps: true,
  },
);
