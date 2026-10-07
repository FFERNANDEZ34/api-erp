import { Model, DataTypes } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class ProductCategoryModel extends Model {
  declare public id: number;
  declare public subscriptionId: number; // 🔒 Candado Multi-Tenant (Holding)
  declare public companyId: number;      // 🔒 Candado Multi-Company (Giro Comercial)
  declare public name: string;
  declare public description: string | null;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ProductCategoryModel.init(
  {
    id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    subscriptionId: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    companyId: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    name: { 
      type: DataTypes.STRING(100), 
      allowNull: false 
    },
    description: { 
      type: DataTypes.STRING(255), 
      allowNull: true 
    },
    isActive: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: true 
    }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'product_categories',
    timestamps: true // ⚡ Sincroniza automáticamente createdAt y updatedAt
  }
);