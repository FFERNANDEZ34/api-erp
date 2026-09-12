import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({
        status: "fail",
        errors: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
  }
  if (
    err.message === "Cliente no encontrado" ||
    err.message === "Credenciales incorrectas"
  ) {
    return res
      .status(err.message === "Cliente no encontrado" ? 404 : 401)
      .json({ status: "fail", message: err.message });
  }
  if (
    err.message.includes("ya está registrado") ||
    err.message.includes("ya está en uso")
  ) {
    return res.status(409).json({ status: "fail", message: err.message });
  }
  console.error("💥 Error:", err);
  return res
    .status(500)
    .json({ status: "error", message: "Algo salió muy mal en el servidor" });
}
