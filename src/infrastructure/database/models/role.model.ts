import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class RoleModel extends Model { declare id: number; declare name: string; }
RoleModel.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false, unique: true }
}, { sequelize: sequelizeInstance, tableName: 'roles', timestamps: false });
