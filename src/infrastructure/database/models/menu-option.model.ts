import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class MenuOptionModel extends Model {
  declare id: number;
  declare parentId: number | null;
  declare title: string;
  declare icon: string | null;
  declare path: string | null;
  declare orderIndex: number;
}
MenuOptionModel.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  parentId: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(100), allowNull: false },
  icon: { type: DataTypes.STRING(100), allowNull: true },
  path: { type: DataTypes.STRING(255), allowNull: true },
  orderIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { sequelize: sequelizeInstance, tableName: 'menu_options', timestamps: false });

// Relación autorreferencial para armar el árbol en SQL si se desea
MenuOptionModel.hasMany(MenuOptionModel, { foreignKey: 'parentId', as: 'children' });
MenuOptionModel.belongsTo(MenuOptionModel, { foreignKey: 'parentId', as: 'parent' });

