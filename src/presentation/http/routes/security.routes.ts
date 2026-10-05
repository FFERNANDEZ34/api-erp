import { Router } from 'express';
import { AssignRolePermissionsUseCase } from '../../../application/use-cases/security/assign-role-permissions';
import { CreateRoleUseCase } from '../../../application/use-cases/roles/create-role.use-case'; 
import { GetRolesUseCase } from '../../../application/use-cases/roles/get-roles.use-case';       
import { UpdateRoleUseCase } from '../../../application/use-cases/roles/update-role.use-case';   
import { DeleteRoleUseCase } from '../../../application/use-cases/roles/delete-role.use-case';   
import { SecurityController } from '../controllers/security.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../middlewares/async-handler.middleware';
import { userController } from './user.routes';

const securityRouter = Router();

// Instanciamos el Caso de Uso Transaccional de la Capa de Aplicación
const assignRolePermissionsUseCase = new AssignRolePermissionsUseCase();
const createRoleUseCase = new CreateRoleUseCase();
const getRolesUseCase = new GetRolesUseCase();
const updateRoleUseCase = new UpdateRoleUseCase();
const deleteRoleUseCase = new DeleteRoleUseCase();

// Lo inyectamos quirúrgicamente en el constructor respetando la arquitectura limpia
const securityController = new SecurityController(assignRolePermissionsUseCase,createRoleUseCase,
  getRolesUseCase,    
  updateRoleUseCase,  
  deleteRoleUseCase   );

// 🔒 Forzamos el blindaje JWT obligatorio para todo el módulo
securityRouter.use(authMiddleware);

securityRouter.get('/roles-paginated', catchAsync((req: any, res: any) => securityController.listRolesPaged(req, res)));
securityRouter.post('/roles', catchAsync((req: any, res: any) => securityController.createNewRole(req, res)));
securityRouter.put('/roles/:id', catchAsync((req: any, res: any) => securityController.editRole(req, res)));
securityRouter.delete('/roles/:id', catchAsync((req: any, res: any) => securityController.inactivateRole(req, res)));


// Publicación de canales HTTP
securityRouter.get('/roles', catchAsync((req: any, res: any) => securityController.getRoles(req, res)));
securityRouter.get('/permissions/:roleId', catchAsync((req: any, res: any) => securityController.getRolePermissionsMatrix(req, res)));
securityRouter.post('/permissions', catchAsync((req: any, res: any) => securityController.saveRolePermissions(req, res)));


securityRouter.get('/subusers', catchAsync((req: any, res: any) => userController.listSubUsers(req, res)));
securityRouter.delete('/subusers/:id', catchAsync((req: any, res: any) => userController.removeSubUser(req, res)));
securityRouter.put('/subusers/:id', catchAsync((req: any, res: any) => userController.editSubUser(req, res)));
securityRouter.post('/register-subuser', catchAsync((req: any, res: any) => userController.registerSubUser(req, res))); // Alineado a tu Angular post

export { securityRouter };