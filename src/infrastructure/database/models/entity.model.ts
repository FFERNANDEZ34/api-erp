import { DataTypes, Model } from "sequelize";
import { sequelizeInstance } from "../sequelize.config";

export class EntityModel extends Model {
  declare id: number;
  declare subscriptionId: number;
  declare entityType: "persona" | "empresa";
  declare documentType: "dni" | "ruc" | "pasaporte" | "ce" | "otros";
  declare documentNumber: string;
  declare name: string;
  declare email: string | null;
}
EntityModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    subscriptionId: { type: DataTypes.INTEGER, allowNull: false }, // Atado únicamente a la suscripción global
    entityType: {
      type: DataTypes.ENUM("persona", "empresa"),
      allowNull: false,
    },
    documentType: {
      type: DataTypes.ENUM("dni", "ruc", "pasaporte", "ce", "otros"),
      allowNull: false,
    },
    documentNumber: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize: sequelizeInstance,
    tableName: "entities",
    indexes: [
      {
        unique: true,
        fields: ["subscriptionId", "documentType", "documentNumber"],
      },
    ],
  },
);
