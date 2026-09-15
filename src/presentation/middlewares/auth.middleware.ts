import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../../infrastructure/database/models/user.model';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    subscriptionId: number;
    isGodMode: boolean;
    permissions: any;
    activeContext?: {
      companyId: number;
      branchId: number;
      role: string;
    };
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'fail', message: 'No se proporcionó un token de autenticación válido.' });
    }

    const token = authHeader.split(' ')[1]; // 👈 Extrae estrictamente la cadena hash limpia del JWT
    const secret = process.env.JWT_SECRET || 'secret';

    // 1. Decodificar el Payload del token JWT
    const decoded = jwt.verify(token, secret) as any;

    // 2. 🚨 CORRECCIÓN RADICAL CONTRA EL DESPLOME DE SEQUELIZE:
    // Al usar .unscoped() y raw: true, Sequelize ya realiza una consulta SQL plana
    // y directa a la tabla, desactivando de forma nativa cualquier hook oculto del modelo
    const userInDb = await UserModel.unscoped().findOne({
      where: { id: decoded.id },
      raw: true // ⚡ Trae el objeto plano de la RAM para máxima velocidad y anula mutaciones del ORM
    }); 
    
    if (!userInDb) {
      return res.status(401).json({ status: 'fail', message: 'El usuario asociado a este token ya no existe.' });
    }

    // 3. Guardar la metadata limpia en la memoria RAM de la petición Express
    req.user = {
      id: decoded.id,
      email: decoded.email,
      subscriptionId: decoded.subscriptionId,
      isGodMode: decoded.isGodMode || false,
      permissions: decoded.permissions || {}, // El JSON complejo se queda viviendo aislado en RAM
      activeContext: decoded.activeContext
    };

    // 4. 🚀 Le damos paso al controlador de menús de forma fluida
    return next();

  } catch (error: any) {
    console.error('💥 Captura de desplome en AuthMiddleware:', error.message);
    return res.status(401).json({ status: 'fail', message: 'Token de acceso inválido o expirado.' });
  }
}