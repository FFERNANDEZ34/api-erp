import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";

export class CompanyModel extends Model {
  declare id: number;
  declare subscriptionId: number;
  declare name: string;
  declare ruc: string;
}
CompanyModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    ruc: { type: DataTypes.STRING(11), allowNull: false, unique: true },
  },
  { sequelize: sequelizeInstance, tableName: "companies" },
);
