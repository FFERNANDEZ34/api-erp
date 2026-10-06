import { Model, DataTypes } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';

export class SubscriptionApplicationModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public applicationId: number;
  declare public readonly activatedAt: Date;
}

SubscriptionApplicationModel.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
  applicationId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  sequelize: sequelizeInstance,
  tableName: 'subscription_applications',
  timestamps: false
});