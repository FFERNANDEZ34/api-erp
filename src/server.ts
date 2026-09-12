import express from "express";
import dotenv from "dotenv";

import { userRouter } from "./presentation/http/routes/user.routes";
import { errorMiddleware } from "./presentation/middlewares/error.middleware";
import { companyRouter } from './presentation/http/routes/company.routes'; // 👈 Importar
import { entityRouter } from './presentation/http/routes/entity.routes'; // 👈 Importar
import { menuRouter } from './presentation/http/routes/menu.routes'; 
import { sequelizeInstance } from "./infrastructure/database/sequelize.config";

dotenv.config();

const app = express();
app.use(express.json());

// Endpoints base
app.use('/api/auth', userRouter);
app.use('/api/entities', entityRouter); // El catálogo compartido de personas/empresas
app.use('/api/companies', companyRouter); // 👈 NUEVO: Registro de las 3 compañías con RUC
app.use('/api/menus', menuRouter);

// Manejador centralizado de errores
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // 1. Conectar a MySQL
    await sequelizeInstance.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');

    

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error crítico en el arranque del sistema:', error);
    process.exit(1);
  }
}

bootstrap();
