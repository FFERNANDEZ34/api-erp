import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { BlacklistModel } from "../../infrastructure/database/models/blacklist.model";

export interface JwtPayload { 
  id: number; 
  email: string; 
  subscriptionId: number;   
  isGodMode: boolean;       // ✅ Asegurar que esté como boolean
  
  // ✅ CORRECCIÓN CRUCIAL: Definimos la estructura indexada de la matriz de permisos
  // Permite indexar por "comp_X" y obtener el mapa de locales y roles
  permissions: Record<string, Record<string, string[]>>; 
}
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({
        status: "fail",
        message: "Token faltante o inválido. Inicie sesión nuevamente.",
      });
  }

  const token = authHeader.split(" ")[1]; // Extraemos el token limpio

  try {
    // 1. Verificar si el token está registrado en la lista negra de MySQL
    const isBlacklisted = await BlacklistModel.findOne({ where: { token } });
    if (isBlacklisted) {
      return res.status(401).json({
        status: "fail",
        message:
          "Esta sesión ha sido cerrada de forma explícita. Por favor, inicie sesión nuevamente.",
      });
    }

    // 2. Si no está en la lista negra, validar firma matemática del JWT
    const secret = process.env.JWT_SECRET || "secret";
    const decoded = jwt.verify(token, secret) as JwtPayload;

    req.user = decoded;
    return next();
  } catch (error) {
    return res
      .status(401)
      .json({
        status: "fail",
        message: "Token inválido o expirado. Inicie sesión nuevamente.",
      });
  }
}
