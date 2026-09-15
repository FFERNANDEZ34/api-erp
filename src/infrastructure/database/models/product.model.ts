import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';
import { AuxiliaryParameterModel } from './auxiliary-parameter.model';

export class ProductModel extends Model {
  // 🌟 EL MAZAZO TECNOLÓGICO: Usamos 'declare' para eliminar la sombra de atributos de TS
  declare public id: number;
  declare public subscriptionId: number;
  declare public companyId: number;
  declare public productCode: string;
  declare public name: string;
  declare public description: string | null;
  declare public sku: string | null;
  declare public barCode: string | null;
  declare public categoryId: number;
  declare public brandId: number;
  declare public currencyParamId: number;
  declare public taxTypeParamId: number;
  declare public unitMeasureParamId: number;
  declare public purchasePrice: number;
  declare public purchaseValue: number;
  declare public salesPrice: number;
  declare public salesValue: number;
  declare public minimumStock: number;
  declare public isActive: boolean;
  declare public isPackage: boolean;
  declare public allowSearch: boolean;
}

ProductModel.init(
  {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false, field: 'subscriptionId' },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'companyId' },
    productCode: { type: DataTypes.STRING(50), allowNull: false, field: 'productCode' },
    name: { type: DataTypes.STRING(150), allowNull: false, field: 'name' },
    description: { type: DataTypes.TEXT, allowNull: true, field: 'description' },
    sku: { type: DataTypes.STRING(100), allowNull: true, field: 'sku' },
    barCode: { type: DataTypes.STRING(100), allowNull: true, field: 'barCode' },
    categoryId: { type: DataTypes.INTEGER, allowNull: false, field: 'categoryId' },
    brandId: { type: DataTypes.INTEGER, allowNull: false, field: 'brandId' },
    currencyParamId: { type: DataTypes.INTEGER, allowNull: false, field: 'currencyParamId' },
    taxTypeParamId: { type: DataTypes.INTEGER, allowNull: false, field: 'taxTypeParamId' },
    unitMeasureParamId: { type: DataTypes.INTEGER, allowNull: false, field: 'unitMeasureParamId' },
    purchasePrice: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0.0000, field: 'purchasePrice' },
    purchaseValue: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0.0000, field: 'purchaseValue' },
    salesPrice: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0.0000, field: 'salesPrice' },
    salesValue: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0.0000, field: 'salesValue' },
    minimumStock: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0.0000, field: 'minimumStock' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'isActive' },
    isPackage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'isPackage' },
    allowSearch: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'allowSearch' }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'products',
    timestamps: true // Asegura que existan createdAt y updatedAt mapeados de forma estándar
  }
);

// Mapeado de Relaciones Cruzadas para las Consultas con Includes de la Rejilla
ProductModel.belongsTo(AuxiliaryParameterModel, { as: 'Category', foreignKey: 'categoryId' });
ProductModel.belongsTo(AuxiliaryParameterModel, { as: 'Brand', foreignKey: 'brandId' });
ProductModel.belongsTo(AuxiliaryParameterModel, { as: 'Currency', foreignKey: 'currencyParamId' });
ProductModel.belongsTo(AuxiliaryParameterModel, { as: 'TaxType', foreignKey: 'taxTypeParamId' });
ProductModel.belongsTo(AuxiliaryParameterModel, { as: 'UnitMeasure', foreignKey: 'unitMeasureParamId' });