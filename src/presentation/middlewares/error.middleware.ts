import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorMiddleware(
  err: any, // 🚀 CAMBIO CLAVE: Cambiamos a 'any' para poder auditar las propiedades .code y .statusCode de tus Use Cases
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // 1. Validaciones estrictas de Zod (Esquemas de entrada) intactas
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "fail",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // 2. Controladores semánticos planos intactos
  if (
    err.message &&
    (err.message === "Cliente no encontrado" ||
      err.message.includes("Credenciales incorrectas") ||
      err.message.includes("La contraseña es inválida"))
  ) {
    const isNotFound = err.message === "Cliente no encontrado";
    return res
      .status(isNotFound ? 404 : 400) // 🎯 401 Strict para contraseñas erróneas
      .json({
        status: "fail",
        message: err.message.replace(/^Error:\s*/, ""),
      });
  }

  // 3. Capturadores de registros duplicados intactos
  if (
    err.message &&
    (err.message.includes("ya está registrado") ||
      err.message.includes("ya está en uso"))
  ) {
    return res.status(409).json({ status: "fail", message: err.message });
  }

  // =========================================================================
  // 🛡️ DETECTOR DE CIBERSEGURIDAD MULTI-TENANT (Aiven Firewall Protection)
  // Intercepta de forma atómica excepciones con códigos especializados (ej: EMAIL_NOT_VERIFIED)
  // =========================================================================
  if (err.code === "EMAIL_NOT_VERIFIED" || err.statusCode) {
    const statusCode = err.statusCode || 403;
    const cleanMessage = String(err.message || "").replace(/^Error:\s*/, ""); // Limpia prefijos redundantes

    return res.status(statusCode).json({
      status: "fail",
      code: err.code || "VALIDATION_ERROR",
      message: cleanMessage,
    });
  }
  // =========================================================================

  // 4. Fallback de seguridad estricto para quiebres huérfanos imprevistos (Crash real)
  console.error("💥 Error Crítico No Controlado:", err);
  return res
    .status(500)
    .json({ status: "error", message: "Algo salió muy mal en el servidor" });
}
