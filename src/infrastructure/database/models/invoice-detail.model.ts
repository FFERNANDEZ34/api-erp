import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';
import { InvoiceHeaderModel } from './invoice-header.model';

export class InvoiceDetailModel extends Model {
  declare public id: number;
  declare public invoiceHeaderId: number;
  declare public productId: number;
  declare public productCode: string;
  declare public productName: string;
  declare public unitMeasureCode: string;
  declare public quantity: number;
  declare public unitPrice: number;
  declare public unitValue: number;
  declare public taxTypeCode: string;
  declare public taxPercentage: number;
  declare public subtotalValue: number;
  declare public subtotalIgv: number;
  declare public subtotalPrice: number;
}

InvoiceDetailModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoiceHeaderId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    productCode: { type: DataTypes.STRING(50), allowNull: false },
    productName: { type: DataTypes.STRING(255), allowNull: false },
    unitMeasureCode: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'NIU' },
    quantity: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    unitPrice: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    unitValue: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    taxTypeCode: { type: DataTypes.STRING(4), allowNull: false, defaultValue: '10' },
    taxPercentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 18.00 },
    subtotalValue: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    subtotalIgv: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    subtotalPrice: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'invoices_details',
    timestamps: true
  }
);

// Establecemos la relación inversa en cascada
InvoiceHeaderModel.hasMany(InvoiceDetailModel, { as: 'Details', foreignKey: 'invoiceHeaderId' });
InvoiceDetailModel.belongsTo(InvoiceHeaderModel, { foreignKey: 'invoiceHeaderId' });