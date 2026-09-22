import { Model, DataTypes } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class InvoicePaymentModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public companyId: number;
  declare public branchId: number;
  declare public invoiceHeaderId: number;
  declare public userId: number;
  declare public paymentMethod: 'EFECTIVO' | 'TARJETA_POS' | 'TRANSFERENCIA' | 'YAPE_PLIN';
  declare public amountPaid: number;
  declare public amountReceived: number;
  declare public cashChange: number;
  declare public transactionNumber: string | null;
  declare public evidencePath: string | null;
  declare public readonly createdAt: Date;
}

InvoicePaymentModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    branchId: { type: DataTypes.INTEGER, allowNull: false },
    invoiceHeaderId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    paymentMethod: { type: DataTypes.STRING(30), allowNull: false },
    amountPaid: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    amountReceived: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    cashChange: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0.0000 },
    transactionNumber: { type: DataTypes.STRING(50), allowNull: true },
    evidencePath: { type: DataTypes.STRING(255), allowNull: true }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'invoice_payments',
    timestamps: false
  }
);