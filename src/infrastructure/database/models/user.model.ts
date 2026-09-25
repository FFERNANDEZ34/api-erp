import { Model, DataTypes } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class UserModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public email: string;
  declare public name: string;        // 🚀 NUEVO
  declare public phone: string | null; // 🚀 NUEVO
  declare public address: string | null; // 🚀 NUEVO
  declare public password: string;
  declare public mustChangePassword: boolean; // 🚀 NUEVO
  declare public isEmailConfirmed: boolean;
  declare public emailConfirmationToken: string | null;
  declare public tokenExpiresAt: Date | null;
  declare public isActive: boolean; // 🚀 CAMBIO A BORRADO LÓGICO
}

UserModel.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  address: { type: DataTypes.STRING(255), allowNull: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  mustChangePassword: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  isEmailConfirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  emailConfirmationToken: { type: DataTypes.STRING(255), allowNull: true },
  tokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  sequelize: sequelizeInstance,
  tableName: 'users',
  timestamps: true
});