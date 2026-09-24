import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";

export class UserModel extends Model {
  declare id: number;
  declare subscriptionId: number;
  declare email: string;
  declare password: string;
  declare refreshToken: string | null;
  declare public isEmailConfirmed: boolean;
  declare public emailConfirmationToken: string | null;
  declare public tokenExpiresAt: Date | null;
}
UserModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    refreshToken: { type: DataTypes.STRING(500), allowNull: true },
    isEmailConfirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailConfirmationToken: { type: DataTypes.STRING(255), allowNull: true },
    tokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize: sequelizeInstance, tableName: "users" },
);
