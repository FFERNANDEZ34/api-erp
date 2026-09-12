import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const isGodMode = req.user?.isGodMode || false;

    // 1. Si es el Super-Admin principal de la suscripción (ID 1), tiene bypass automático a todo el sistema
    if (isGodMode) {
      return next();
    }

    // 2. Extraer las cabeceras contextuales enviadas por el frontend
    const activeCompanyId = req.headers['x-company-id'] as string;
    const activeBranchId = req.headers['x-branch-id'] as string;

    if (!activeCompanyId || !activeBranchId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Seguridad Multi-Tenant: Se requieren las cabeceras x-company-id y x-branch-id para auditar esta operación.'
      });
    }

    // 3. Formatear las llaves de la matriz del JWT
    const companyKey = `comp_${activeCompanyId}`;
    const branchKey = `branch_${activeBranchId}`;

    // 4. Buscar los roles que tiene este usuario en ese local específico
    const userCompanyPermissions = req.user?.permissions?.[companyKey] || {};
    const assignedRolesInBranch = userCompanyPermissions[branchKey] || [];

    // 5. Validar si el usuario posee al menos uno de los roles requeridos para el endpoint
    const hasPermission = assignedRolesInBranch.some(role => allowedRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: `Acceso Denegado: Su usuario no posee los roles requeridos (${allowedRoles.join(', ')}) asignados para este local específico.`
      });
    }

    return next();
  };
}