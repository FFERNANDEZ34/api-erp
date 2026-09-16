import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';
import { CompanyModel } from './company.model';

export class DocumentSeriesModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public companyId: number;
  declare public branchId: number | null;
  declare public documentType: string;
  declare public series: string;
  declare public currentNumber: number;
  declare public description: string | null;
  declare public isActive: boolean;
}

DocumentSeriesModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    branchId: { type: DataTypes.INTEGER, allowNull: true },
    documentType: { type: DataTypes.STRING(50), allowNull: false },
    series: { type: DataTypes.STRING(4), allowNull: false },
    currentNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    description: { type: DataTypes.STRING(150), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'sys_document_series',
    timestamps: true
  }
);

DocumentSeriesModel.belongsTo(CompanyModel, { as: 'Company', foreignKey: 'companyId' });