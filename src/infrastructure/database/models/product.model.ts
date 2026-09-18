import { Model, DataTypes } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class ProductModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public companyId: number;
  declare public productCode: string;
  declare public name: string;
  declare public description: string | null;
  declare public sku: string | null;
  declare public barCode: string | null;
  declare public purchasePrice: number;
  declare public purchaseValue: number;
  declare public salesPrice: number;
  declare public salesValue: number;
  declare public stock: number; // 📦 Columna caché de saldos rápidos multi-almacén
  declare public minimumStock: number;
  declare public categoryId: number;
  declare public brandId: number;
  declare public currencyParamId: number;
  declare public taxTypeParamId: number;
  declare public unitMeasureParamId: number;
  declare public isPackage: boolean;
  declare public allowSearch: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ProductModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    subscriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // branchId: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    // },
    productCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    barCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0.0000,
    },
    purchaseValue: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0.0000,
    },
    salesPrice: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0.0000,
    },
    salesValue: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0.0000,
    },
    // 🎯 INTEGRACIÓN DE STOCK: Con precisión de 4 decimales requerida por la SUNAT (para pesos/fracciones)
    stock: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0.0000,
    },
    minimumStock: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0.0000,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    brandId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currencyParamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    taxTypeParamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitMeasureParamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isPackage: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    allowSearch: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'products',
    timestamps: true,
  }
);