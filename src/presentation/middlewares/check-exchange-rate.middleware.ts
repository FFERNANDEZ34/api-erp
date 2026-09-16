import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { CurrencyExchangeModel } from "../../infrastructure/database/models/currency-exchange.model";

export async function checkExchangeRateMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const subscriptionId = req.user?.subscriptionId;


    // 1. 🛡️ BYPASS ESTRATÉGICO: Rutas exentas del candado financiero
    const openRoutes = ["/api/auth", "/api/menus", "/api/exchanges","/api/products/parameters"];
    const isExempt = openRoutes.some((route) =>
      req.originalUrl.startsWith(route),
    );



    if (isExempt || !subscriptionId) {
      return next();
    }

    // 2. 📅 OBTENER FECHA ACTUAL AJUSTADA A ZONA HORARIA LOCAL (PERÚ UTC-5)
    // Esto evita que el ISOString se adelante un día por la diferencia horaria de GreenWich.
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");

    const todayStr = `${year}-${month}-${day}`; // Produce exactamente '2026-09-15'

    

    // 3. 🔍 AUDITORÍA EN TIEMPO REAL: Buscamos si el Holding ya registró cotizaciones hoy
    const exchangeExists = await CurrencyExchangeModel.findOne({
      where: {
        subscriptionId,
        exchangeDate: todayStr,
      },
      raw: true,
    });

    

    // 4. 🚫 FRENO DE MANO ABSOLUTO: Si no hay tipo de cambio diario, bloqueamos la operación
    if (!exchangeExists) {

      return res.status(428).json({
        status: "fail",
        code: "EXCHANGE_RATE_REQUIRED",
        message:
          "Acceso restringido: No se ha registrado el Tipo de Cambio Diario obligatorio. Diríjase al módulo financiero para regularizar la cotización del día.",
      });
    }

    
    return next();
  } catch (error: any) {
    
    return res
      .status(500)
      .json({
        status: "error",
        message: "Error interno en la verificación de divisas.",
      });
  }
}
