import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";

export class UserModel extends Model {
  declare id: number;
  declare subscriptionId: number;
  declare email: string;
  declare password: string;
  declare refreshToken: string | null;
}
UserModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    refreshToken: { type: DataTypes.STRING(500), allowNull: true },
  },
  { sequelize: sequelizeInstance, tableName: "users" },
);
