import { Model, DataTypes } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class RoleMenuPermissionModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public roleId: number;
  declare public menuOptionId: number;
  declare public readonly createdAt: Date;
}

RoleMenuPermissionModel.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
  roleId: { type: DataTypes.INTEGER, allowNull: false },
  menuOptionId: { type: DataTypes.INTEGER, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  sequelize: sequelizeInstance,
  tableName: 'role_menu_permissions', // 🎯 Soldado a tu nombre exacto
  timestamps: false
});