import { Model, DataTypes } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class RoleModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public companyId: number;
  declare public name: string;
  declare public description: string | null;
  declare public isActive: boolean;
}

RoleModel.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
  companyId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(50), allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  sequelize: sequelizeInstance,
  tableName: 'roles',
  timestamps: false // Sincronizado a tu DDL plano
});