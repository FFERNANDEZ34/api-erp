import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";

export class SubscriptionModel extends Model {
  declare id: number;
  declare contactName: string;
  declare contactEmail: string;
  declare planType: string;
  declare maxCompanies: number;
}
SubscriptionModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    contactName: { type: DataTypes.STRING, allowNull: false },
    contactEmail: { type: DataTypes.STRING, allowNull: false, unique: true },
    planType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "demo",
    },
    maxCompanies: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
  },
  { sequelize: sequelizeInstance, tableName: "subscriptions" },
);
