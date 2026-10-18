import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { userRouter } from "./presentation/http/routes/user.routes.js";
import { errorMiddleware } from "./presentation/middlewares/error.middleware.js";
import { companyRouter } from "./presentation/http/routes/company.routes.js";
import { entityRouter } from "./presentation/http/routes/entity.routes.js";
import { menuRouter } from "./presentation/http/routes/menu.routes.js";
import { sequelizeInstance } from "./infrastructure/database/sequelize.config.js";
import { productRouter } from "./presentation/http/routes/product.routes.js";
import { exchangeRouter } from "./presentation/http/routes/exchange.routes.js";
import { checkExchangeRateMiddleware } from "./presentation/middlewares/check-exchange-rate.middleware.js";
import { authMiddleware } from "./presentation/middlewares/auth.middleware.js";
import { branchRouter } from "./presentation/http/routes/branch.routes.js";
import { seriesRouter } from "./presentation/http/routes/series.routes.js";
import { attachmentRouter } from "./presentation/http/routes/attachment.routes.js";
import { invoiceRouter } from "./presentation/http/routes/invoice.routes.js";
import { kardexRouter } from "./presentation/http/routes/kardex.routes.js";
import { paymentRouter } from "./presentation/http/routes/payment.routes.js";
import { dashboardRouter } from "./presentation/http/routes/dashboard.routes.js"; 
import { securityRouter } from "./presentation/http/routes/security.routes.js"; 
import { adminRouter } from "./presentation/http/routes/admin.routes.js"; 



import path from "path";

dotenv.config();


const app = express();

app.use(
  cors({
    origin: "http://localhost:4200", // Permite que tu Angular se conecte
    credentials: true,
  }),
);

app.use(express.json());

//app.use('/storage', express.static(path.join(process.cwd(), 'storage')));
app.use(express.static(process.cwd()));

// A. Rutas exentas de candado interno (Necesarias para arrancar el sistema)
app.use("/api/auth", userRouter);
app.use("/api/menus", authMiddleware, menuRouter);
app.use("/api/exchanges", exchangeRouter); // Libre de candado interno para poder registrar la cotización

// B. Rutas operativas transaccionales blindadas por la Matriz de Divisas
// Al poner 'authMiddleware' ANTES de 'checkExchangeRateMiddleware', garantizamos que exista req.user
app.use(
  "/api/entities",
  authMiddleware,
  checkExchangeRateMiddleware,
  entityRouter,
);
app.use(
  "/api/companies",
  authMiddleware,
  checkExchangeRateMiddleware,
  companyRouter,
);
app.use(
  "/api/products",
  authMiddleware,
  checkExchangeRateMiddleware,
  productRouter,
);
app.use(
  "/api/branches",
  authMiddleware,
  checkExchangeRateMiddleware,
  branchRouter,
);
app.use(
  "/api/series",
  authMiddleware,
  checkExchangeRateMiddleware,
  seriesRouter,
);
app.use("/api/attachments", attachmentRouter);
app.use(
  "/api/invoices",
  authMiddleware,
  checkExchangeRateMiddleware,
  invoiceRouter,
);
app.use(
  "/api/kardex",
  authMiddleware,
  checkExchangeRateMiddleware,
  kardexRouter,
);
app.use(
  "/api/payments",
  authMiddleware,
  checkExchangeRateMiddleware,
  paymentRouter,
);

app.use("/api/dashboard", authMiddleware, checkExchangeRateMiddleware, dashboardRouter); 
app.use("/api/security", authMiddleware, checkExchangeRateMiddleware, securityRouter); 

app.use('/api/admin', adminRouter);
// Manejador centralizado de errores
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // 1. Conectar a MySQL
    await sequelizeInstance.authenticate();
    console.log("✅ Conexión a MySQL establecida correctamente.");

    await sequelizeInstance.sync({ alter: false, force: false });
    console.log("📦 Modelos y Catálogos de Sequelize sincronizados en la RAM.");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error crítico en el arranque del sistema:", error);
    process.exit(1);
  }
}

bootstrap();
