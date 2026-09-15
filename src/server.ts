import express from "express";
import dotenv from "dotenv";
import cors from 'cors'; 

import { userRouter } from "./presentation/http/routes/user.routes";
import { errorMiddleware } from "./presentation/middlewares/error.middleware";
import { companyRouter } from './presentation/http/routes/company.routes'; // 👈 Importar
import { entityRouter } from './presentation/http/routes/entity.routes'; // 👈 Importar
import { menuRouter } from './presentation/http/routes/menu.routes'; 
import { sequelizeInstance } from "./infrastructure/database/sequelize.config";
import { productRouter } from './presentation/http/routes/product.routes';
import { exchangeRouter } from './presentation/http/routes/exchange.routes'; 
import { checkExchangeRateMiddleware } from './presentation/middlewares/check-exchange-rate.middleware'; 
import { authMiddleware } from "./presentation/middlewares/auth.middleware"; 

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:4200', // Permite que tu Angular se conecte
  credentials: true
}));

app.use(express.json());



// A. Rutas exentas de candado interno (Necesarias para arrancar el sistema)
app.use('/api/auth', userRouter);
app.use('/api/menus', authMiddleware, menuRouter);
app.use('/api/exchanges', exchangeRouter); // Libre de candado interno para poder registrar la cotización

// B. Rutas operativas transaccionales blindadas por la Matriz de Divisas
// Al poner 'authMiddleware' ANTES de 'checkExchangeRateMiddleware', garantizamos que exista req.user
app.use('/api/entities', authMiddleware, checkExchangeRateMiddleware, entityRouter); 
app.use('/api/companies', authMiddleware, checkExchangeRateMiddleware, companyRouter); 
app.use('/api/products', authMiddleware, checkExchangeRateMiddleware, productRouter);


// Manejador centralizado de errores
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // 1. Conectar a MySQL
    await sequelizeInstance.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');

    await sequelizeInstance.sync({ alter: false, force: false });
    console.log('📦 Modelos y Catálogos de Sequelize sincronizados en la RAM.');


    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error crítico en el arranque del sistema:', error);
    process.exit(1);
  }
}

bootstrap();
