import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class AttachmentModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public relatedModule: string;
  declare public relatedRecordId: number;
  declare public fileName: string;
  declare public fileUrl: string;
  declare public mimeType: string;
  declare public fileExtension: string;
  declare public fileSize: number;
  declare public isMainPhoto: boolean;
}

AttachmentModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    relatedModule: { type: DataTypes.STRING(50), allowNull: false },
    relatedRecordId: { type: DataTypes.INTEGER, allowNull: false },
    fileName: { type: DataTypes.STRING(255), allowNull: false },
    fileUrl: { type: DataTypes.STRING(500), allowNull: false },
    mimeType: { type: DataTypes.STRING(100), allowNull: false },
    fileExtension: { type: DataTypes.STRING(10), allowNull: false },
    fileSize: { type: DataTypes.INTEGER, allowNull: false },
    isMainPhoto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'sys_attachments',
    timestamps: true
  }
);