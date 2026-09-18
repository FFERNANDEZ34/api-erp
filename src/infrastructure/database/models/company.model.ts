import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class CompanyModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public ruc: string;
  declare public name: string;
  declare public address: string | null;
  declare public phone: string | null;
  declare public email: string | null;
  declare public sunatUser: string | null;          // 👈 Nuevo: Usuario SOL SECUNDARIO
  declare public sunatPassword: string | null;      // 👈 Nuevo: Clave SOL
  declare public certificatePassword: string | null;
  declare public isActive: boolean;
}

CompanyModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    ruc: { type: DataTypes.STRING(11), allowNull: false },
    name: { type: DataTypes.STRING(150), allowNull: false },
    address: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    email: { type: DataTypes.STRING(100), allowNull: true },
    sunatUser: { type: DataTypes.STRING(50), allowNull: true },
    sunatPassword: { type: DataTypes.STRING(100), allowNull: true },
    certificatePassword: { type: DataTypes.STRING(100), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'companies',
    timestamps: true
  }
);