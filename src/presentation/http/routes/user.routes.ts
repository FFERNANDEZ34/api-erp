import { Router } from 'express';
import { MySqlUserRepository } from '../../../infrastructure/repositories/mysql-user.repository';
import { MySqlCompanyRepository } from '../../../infrastructure/repositories/mysql-company.repository'; // 👈 Importar
import { CreateUserUseCase } from '../../../application/use-cases/users/create-user';
import { LoginUserUseCase } from '../../../application/use-cases/users/login-user';
import { RefreshTokenUseCase } from '../../../application/use-cases/users/refresh-token';
import { LogoutUserUseCase } from '../../../application/use-cases/users/logout-user';
import { SubscribeCompanyUseCase } from '../../../application/use-cases/users/subscribe-company'; 
import { SwitchContextUseCase } from '../../../application/use-cases/users/switch-context';

import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../middlewares/async-handler.middleware';

const userRouter = Router();

// 1. Instanciamos los repositorios físicos de MySQL
const userRepository = new MySqlUserRepository();
const companyRepository = new MySqlCompanyRepository(); 
const switchContextUseCase = new SwitchContextUseCase(); 

// 2. Instanciamos los Casos de Uso pasándoles sus repositorios

// 1. Instanciamos los Casos de Uso (⚠️ ¡Sin pasar parámetros en el constructor!)
const createUserUseCase = new CreateUserUseCase();
const loginUserUseCase = new LoginUserUseCase();
const refreshUseCase = new RefreshTokenUseCase(userRepository);
const logoutUseCase = new LogoutUserUseCase(userRepository);
const subscribeCompanyUseCase = new SubscribeCompanyUseCase(); // ✅ Corrección: Limpio sin parámetros



// 3. Inyectamos TODOS los casos de uso ordenadamente en el controlador
const userController = new UserController(
  createUserUseCase,
  loginUserUseCase,
  refreshUseCase,
  logoutUseCase,
  subscribeCompanyUseCase,
  switchContextUseCase  
);

// 4. Endpoints de la API
userRouter.post('/subscribe', catchAsync((req: any, res: any) => userController.subscribe(req, res)));
userRouter.post('/login', catchAsync((req: any, res: any) => userController.login(req, res)));
userRouter.post('/refresh', catchAsync((req: any, res: any) => userController.refresh(req, res)));
userRouter.post('/logout', authMiddleware, catchAsync((req: any, res: any) => userController.logout(req, res)));
userRouter.post('/register-user', authMiddleware, catchAsync((req: any, res: any) => userController.registerSubUser(req, res)));
userRouter.post('/switch-context', authMiddleware, catchAsync((req: any, res: any) => userController.switchContext(req, res)));

export { userRouter };