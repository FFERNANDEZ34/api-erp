import { Model, DataTypes } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class ProductKardexModel extends Model {
  public id!: number;
  public subscriptionId!: number;
  public companyId!: number;
  public branchId!: number;
  public productId!: number;
  public movementType!: 'INGRESO' | 'SALIDA';
  public sourceDocument!: string;
  public quantity!: number;
  public previousStock!: number;
  public actualStock!: number;
  public readonly createdAt!: Date;
}

ProductKardexModel.init(
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
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    movementType: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    sourceDocument: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0.0000,
    },
    previousStock: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0.0000,
    },
    actualStock: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0.0000,
    },
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'product_kardex',
    timestamps: false, // El campo createdAt es manejado directamente por el DEFAULT de MySQL
  }
);