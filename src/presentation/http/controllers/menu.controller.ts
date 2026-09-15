import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { GetAssignedMenuUseCase } from '../../../application/use-cases/menus/get-assigned-menu';

export class MenuController {
  constructor(private readonly getAssignedMenuUseCase: GetAssignedMenuUseCase) {}

 async getUserMenu(req: AuthenticatedRequest, res: Response) {
  try {
    const subscriptionId = req.user?.subscriptionId;
    const permissionsMatrix = req.user?.permissions;

    const companyId = parseInt(req.headers['x-company-id'] as string);
    const branchId = parseInt(req.headers['x-branch-id'] as string);

    const currentCompanyId = !isNaN(companyId) ? companyId : req.user?.activeContext?.companyId || 1;
    const currentBranchId = !isNaN(branchId) ? branchId : req.user?.activeContext?.branchId || 1;
    
    // 🎯 CAPTURAMOS EL NOMBRE DEL ROL ACTIVO DESDE LA SESIÓN DEL JWT EN MEMORIA RAM
    const currentRoleName = req.user?.activeContext?.role || 'super-admin';

    if (!subscriptionId || !permissionsMatrix) {
      return res.status(401).json({ status: 'fail', message: 'Sesión transaccional nula o expirada.' });
    }

    const menuTree = await this.getAssignedMenuUseCase.execute({
      subscriptionId,
      permissionsMatrix,
      companyId: currentCompanyId,
      branchId: currentBranchId,
      roleName: currentRoleName // 👈 INYECTAMOS EL NOMBRE DEL PERFIL ACTIVO
    });

    return res.status(200).json({
      status: 'success',
      data: menuTree
    });
    
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: 'Error interno al procesar el menú.' });
  }
}
}