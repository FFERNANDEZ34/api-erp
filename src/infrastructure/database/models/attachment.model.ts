import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";

export class AttachmentModel extends Model {
  public id!: number;
  public subscriptionId!: number;
  public relatedModule!:
    | "PRODUCTOS"
    | "ENTIDADES_CLIENTES"
    | "COMPRAS"
    | "FACTURACION";
  public relatedRecordId!: number;
  public fileName!: string;
  public fileUrl!: string;
  public mimeType!: string;
  public fileExtension!: string;
  public fileSize!: number;
  public isMainPhoto!: boolean;
}

AttachmentModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
    relatedModule: { type: DataTypes.STRING(50), allowNull: false },
    relatedRecordId: { type: DataTypes.INTEGER, allowNull: false },
    fileName: { type: DataTypes.STRING(255), allowNull: false },
    fileUrl: { type: DataTypes.TEXT, allowNull: false },
    mimeType: { type: DataTypes.STRING(100), allowNull: false },
    fileExtension: { type: DataTypes.STRING(10), allowNull: false },
    fileSize: { type: DataTypes.INTEGER, allowNull: false },
    isMainPhoto: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize: sequelizeInstance,
    tableName: "sys_attachments",
    timestamps: true,
  },
);
