import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';
import { CompanyModel } from './company.model';

export class BranchWarehouseModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public companyId: number;
  declare public name: string;
  declare public address: string | null;
  declare public isPointOfSale: boolean;
  declare public isWarehouse: boolean;
  declare public defaultWarehouseId: number | null;
  declare public isActive: boolean;
}

BranchWarehouseModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    address: { type: DataTypes.STRING(255), allowNull: true },
    isPointOfSale: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isWarehouse: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    defaultWarehouseId: { type: DataTypes.INTEGER, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'branches_warehouses',
    timestamps: true
  }
);

// Relaciones Cruzadas (Includes)
BranchWarehouseModel.belongsTo(CompanyModel, { as: 'Company', foreignKey: 'companyId' });
BranchWarehouseModel.belongsTo(BranchWarehouseModel, { as: 'DefaultWarehouse', foreignKey: 'defaultWarehouseId' });
