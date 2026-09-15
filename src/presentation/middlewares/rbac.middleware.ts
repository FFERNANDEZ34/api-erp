import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 1. Si el usuario opera en modo Super-Admin global (GodMode / ID 1), bypass automático
    const isGodMode = req.user?.isGodMode || false;
    if (isGodMode) {
      return next();
    }

    // 2. Extraer las cabeceras contextuales transaccionales enviadas por Angular
    const activeCompanyId = req.headers['x-company-id'] as string;
    const activeBranchId = req.headers['x-branch-id'] as string;

    // Si es el arranque inicial de Angular y las cabeceras aún no viajan, usamos el contexto activo del token
    const currentCompanyId = activeCompanyId || req.user?.activeContext?.companyId;
    const currentBranchId = activeBranchId || req.user?.activeContext?.branchId;

    if (!currentCompanyId || !currentBranchId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Seguridad Multi-Tenant: Se requieren las cabeceras de contexto de la barra superior.'
      });
    }

    // 3. Formatear las llaves exactas que viajan estructuradas en tu nuevo Token JWT
    const companyKey = `comp_${currentCompanyId}`;
    const branchKey = `branch_${currentBranchId}`;

    // 4. Extraer de forma ultra-segura los roles del local activo EN MEMORIA RAM (Cero consultas SQL)
    const companyData = (req.user?.permissions?.[companyKey]) as any || { branches: {} };
    const branchesMap = companyData.branches || {};
    const branchData = branchesMap[branchKey] || { roles: [] };
    const assignedRolesInBranch: string[] = branchData.roles || [];

    // 5. Validar matemáticamente si el usuario posee al menos uno de los roles requeridos
    const hasPermission = assignedRolesInBranch.some(role => allowedRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: `Acceso Denegado: Su usuario no cuenta con el perfil requerido (${allowedRoles.join(', ')}) para operar en esta sede.`
      });
    }

    // 🚀 ¡ÉXITO!: El flujo avanza limpiamente hacia el controlador del menú
    return next();
  };
}