import { Model, DataTypes } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class RoleModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public companyId: number; // 🚀 ADAPTADO: Obligatorio según tu DDL
  declare public name: string;
  declare public description: string | null; // 🚀 ADAPTADO: Columna real
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

RoleModel.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
  companyId: { type: DataTypes.INTEGER, allowNull: false }, // 🎯 Sincronizado
  name: { type: DataTypes.STRING(50), allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true }, // 🎯 Sincronizado
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  sequelize: sequelizeInstance,
  tableName: 'roles',
  timestamps: false // 💡 Tu DDL real no registra columnas de timestamps nativas, Sequelize leerá solo lo declarado
});