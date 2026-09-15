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

    console.log("============ 🚨 AUDITORÍA DE CANDADO FINANCIERO ============");
    console.log(
      `1. Ruta detectada en la petición: ${req.originalUrl} [${req.method}]`,
    );
    console.log(`2. ID de Suscripción en la sesión: ${subscriptionId}`);

    // 1. 🛡️ BYPASS ESTRATÉGICO: Rutas exentas del candado financiero
    const openRoutes = ["/api/auth", "/api/menus", "/api/exchanges","/api/products/parameters"];
    const isExempt = openRoutes.some((route) =>
      req.originalUrl.startsWith(route),
    );

    console.log(`3. ¿Esta ruta está exenta del bloqueo?: ${isExempt}`);

    if (isExempt || !subscriptionId) {
      console.log(
        "➡️ Acción: Ruta exenta o sin sesión. Dando libre tránsito (next).",
      );
      console.log(
        "===========================================================",
      );
      return next();
    }

    // 2. 📅 OBTENER FECHA ACTUAL AJUSTADA A ZONA HORARIA LOCAL (PERÚ UTC-5)
    // Esto evita que el ISOString se adelante un día por la diferencia horaria de GreenWich.
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");

    const todayStr = `${year}-${month}-${day}`; // Produce exactamente '2026-09-15'

    console.log(`4. Fecha calculada del servidor: ${todayStr}`);

    // 3. 🔍 AUDITORÍA EN TIEMPO REAL: Buscamos si el Holding ya registró cotizaciones hoy
    const exchangeExists = await CurrencyExchangeModel.findOne({
      where: {
        subscriptionId,
        exchangeDate: todayStr,
      },
      raw: true,
    });

    console.log(`5. ¿Existe tipo de cambio hoy en la BD?: ${!!exchangeExists}`);

    // 4. 🚫 FRENO DE MANO ABSOLUTO: Si no hay tipo de cambio diario, bloqueamos la operación
    if (!exchangeExists) {
      console.warn(
        "⛔ Freno de mano activado: Bloqueando petición con código 428.",
      );
      console.log(
        "===========================================================",
      );

      return res.status(428).json({
        status: "fail",
        code: "EXCHANGE_RATE_REQUIRED",
        message:
          "Acceso restringido: No se ha registrado el Tipo de Cambio Diario obligatorio. Diríjase al módulo financiero para regularizar la cotización del día.",
      });
    }

    console.log(
      "🔓 Candado abierto: Tipo de cambio al día. Continuando hacia el caso de uso...",
    );
    console.log("===========================================================");

    return next();
  } catch (error: any) {
    console.error("💥 Error en el middleware:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "Error interno en la verificación de divisas.",
      });
  }
}
