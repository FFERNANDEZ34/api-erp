import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';
import { AuxiliaryParameterModel } from './auxiliary-parameter.model';

export class CurrencyExchangeModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public exchangeDate: string; // Formato 'YYYY-MM-DD'
  declare public currencyParamId: number;
  declare public currencyCode: string;
  declare public buyPrice: number;
  declare public sellPrice: number;
}

CurrencyExchangeModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    exchangeDate: { type: DataTypes.DATEONLY, allowNull: false },
    currencyParamId: { type: DataTypes.INTEGER, allowNull: false },
    currencyCode: { type: DataTypes.STRING(10), allowNull: false },
    buyPrice: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0.0000 },
    sellPrice: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0.0000 }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'sys_currency_exchanges',
    timestamps: true
  }
);

CurrencyExchangeModel.belongsTo(AuxiliaryParameterModel, { as: 'CurrencyParam', foreignKey: 'currencyParamId' });