import { Router } from 'express';
import { GetAssignedMenuUseCase } from '../../../application/use-cases/menus/get-assigned-menu';
import { GrantMenuPermissionsUseCase } from '../../../application/use-cases/menus/grant-menu-permissions';

import { MenuController } from '../controllers/menu.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../middlewares/async-handler.middleware';

import { requireRole } from '../../middlewares/rbac.middleware';

const menuRouter = Router();

// Instanciamos el caso de uso y el controlador nativo
const getAssignedMenuUseCase = new GetAssignedMenuUseCase();
const grantUseCase = new GrantMenuPermissionsUseCase();
const menuController = new MenuController(getAssignedMenuUseCase,grantUseCase);
// Forzamos la protección de sesión para todas las rutas de menús
menuRouter.use(authMiddleware);

// Endpoint exacto que estás consultando en Postman
menuRouter.get('/sidebar', catchAsync((req: any, res: any) => menuController.getUserMenu(req, res)));


menuRouter.post('/grant', requireRole(['super-admin']), catchAsync((req: any, res: any) => menuController.grantPermissions(req, res)));

export { menuRouter };