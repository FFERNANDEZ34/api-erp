import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const isLocal = process.env.DB_HOST === '127.0.0.1' || process.env.DB_HOST === 'localhost';


export const sequelizeInstance = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASS!,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
    dialectOptions: {
       ssl: isLocal ? false : {
        rejectUnauthorized: false
      }
    },
  },
);
