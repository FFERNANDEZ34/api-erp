import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class BlacklistModel extends Model {
  public id!: number;
  public token!: string;
  public expiresAt!: Date;
}

BlacklistModel.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  token: { type: DataTypes.STRING(500), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: sequelizeInstance,
  tableName: 'token_blacklist',
  timestamps: false,
});