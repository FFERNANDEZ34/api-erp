import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';
import { RoleModel } from './role.model';
import { MenuOptionModel } from './menu-option.model';

export class RoleMenuPermissionModel extends Model {
  declare id: number;
  declare subscriptionId: number;
  declare roleId: number;
  declare menuOptionId: number;
}
RoleMenuPermissionModel.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
  roleId: { type: DataTypes.INTEGER, allowNull: false },
  menuOptionId: { type: DataTypes.INTEGER, allowNull: false }
}, { sequelize: sequelizeInstance, tableName: 'role_menu_permissions', timestamps: false });

RoleMenuPermissionModel.belongsTo(RoleModel, { foreignKey: 'roleId' });
RoleMenuPermissionModel.belongsTo(MenuOptionModel, { foreignKey: 'menuOptionId' });