import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class AuxiliaryParameterModel extends Model {
  // 🌟 EL MAZAZO: Usamos declare para limpiar la sombra de atributos de TypeScript
  declare public id: number;
  declare public subscriptionId: number;
  declare public parameterType: string;
  declare public code: string;
  declare public name: string;
  declare public description: string | null;
  declare public isActive: boolean;
}

AuxiliaryParameterModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    parameterType: { type: DataTypes.STRING(50), allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'sys_auxiliary_parameters',
    timestamps: true
  }
);