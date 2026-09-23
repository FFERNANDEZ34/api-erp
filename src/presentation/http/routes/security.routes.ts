import { Router } from 'express';
import { AssignRolePermissionsUseCase } from '../../../application/use-cases/security/assign-role-permissions';
import { SecurityController } from '../controllers/security.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../middlewares/async-handler.middleware';

const securityRouter = Router();

// Instanciamos el Caso de Uso Transaccional de la Capa de Aplicación
const assignRolePermissionsUseCase = new AssignRolePermissionsUseCase();

// Lo inyectamos quirúrgicamente en el constructor respetando la arquitectura limpia
const securityController = new SecurityController(assignRolePermissionsUseCase);

// 🔒 Forzamos el blindaje JWT obligatorio para todo el módulo
securityRouter.use(authMiddleware);

// Publicación de canales HTTP
securityRouter.get('/roles', catchAsync((req: any, res: any) => securityController.getRoles(req, res)));
securityRouter.get('/permissions/:roleId', catchAsync((req: any, res: any) => securityController.getRolePermissionsMatrix(req, res)));
securityRouter.post('/permissions', catchAsync((req: any, res: any) => securityController.saveRolePermissions(req, res)));

export { securityRouter };