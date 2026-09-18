import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class InvoiceHeaderModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public companyId: number;
  declare public branchId: number;
  declare public userId: number;
  declare public documentType: string;
  declare public series: string;
  declare public correlative: string;
  declare public fullDocumentNumber: string;
  declare public issueDate: string;
  declare public issueTime: string;
  declare public dueDate: string | null;
  declare public customerId: number;
  declare public customerIdentityType: string;
  declare public customerIdentityNumber: string;
  declare public customerName: string;
  declare public customerAddress: string | null;
  declare public currencyCode: string;
  declare public exchangeRate: number;
  declare public totalGravada: number;
  declare public totalExonerada: number;
  declare public totalInafecta: number;
  declare public totalGratuita: number;
  declare public totalIgv: number;
  declare public totalIsc: number;
  declare public totalOtrosCargos: number;
  declare public totalVenta: number;
  declare public totalLetras: string;
  declare public paymentStatus: string;
  declare public sunatStatus: string;
  declare public sunatResponseCode: string | null;
  declare public sunatDescription: string | null;
}

InvoiceHeaderModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    branchId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    documentType: { type: DataTypes.STRING(50), allowNull: false },
    series: { type: DataTypes.STRING(4), allowNull: false },
    correlative: { type: DataTypes.STRING(8), allowNull: false },
    fullDocumentNumber: { type: DataTypes.STRING(15), allowNull: false },
    issueDate: { type: DataTypes.DATEONLY, allowNull: false },
    issueTime: { type: DataTypes.TIME, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    customerIdentityType: { type: DataTypes.STRING(2), allowNull: false },
    customerIdentityNumber: { type: DataTypes.STRING(15), allowNull: false },
    customerName: { type: DataTypes.STRING(255), allowNull: false },
    customerAddress: { type: DataTypes.STRING(255), allowNull: true },
    currencyCode: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'PEN' },
    exchangeRate: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 1.0000 },
    totalGravada: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    totalExonerada: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    totalInafecta: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    totalGratuita: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    totalIgv: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    totalIsc: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    totalOtrosCargos: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    totalVenta: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    totalLetras: { type: DataTypes.STRING(255), allowNull: false },
    paymentStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PENDIENTE' },
    sunatStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PENDIENTE' },
    sunatResponseCode: { type: DataTypes.STRING(10), allowNull: true },
    sunatDescription: { type: DataTypes.STRING(255), allowNull: true }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'invoices_header',
    timestamps: true
  }
);