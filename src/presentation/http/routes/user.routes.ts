import { Router } from "express";
import { MySqlUserRepository } from "../../../infrastructure/repositories/mysql-user.repository";
import { MySqlCompanyRepository } from "../../../infrastructure/repositories/mysql-company.repository";
import { CreateUserUseCase } from "../../../application/use-cases/users/create-user";
import { LoginUserUseCase } from "../../../application/use-cases/users/login-user";
import { RefreshTokenUseCase } from "../../../application/use-cases/users/refresh-token";
import { LogoutUserUseCase } from "../../../application/use-cases/users/logout-user";
import { SubscribeCompanyUseCase } from "../../../application/use-cases/users/subscribe-company";
import { SwitchContextUseCase } from "../../../application/use-cases/users/switch-context";
import { ConfirmEmailUseCase } from "../../../application/use-cases/users/confirm-email";
import { GetUsersUseCase } from "../../../application/use-cases/users/get-users"; // 🚀 NUEVO
import { UpdateUserUseCase } from "../../../application/use-cases/users/update-user"; // 🚀 NUEVO
import { DeleteUserUseCase } from "../../../application/use-cases/users/delete-user"; // 🚀 NUEVO
import { ResendVerificationUseCase } from "../../../application/use-cases/users/resend-verification"; // 🚀 IMPORTA
import { ChangePasswordUseCase } from '../../../application/use-cases/users/change-password'; // 🚀 IMPORTA


import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { catchAsync } from "../../middlewares/async-handler.middleware";

const userRouter = Router();

// 1. Instanciamos los repositorios físicos de MySQL
const userRepository = new MySqlUserRepository();
const companyRepository = new MySqlCompanyRepository();

// 2. Instanciamos los Casos de Uso
const switchContextUseCase = new SwitchContextUseCase();
const confirmEmailUseCase = new ConfirmEmailUseCase();
const createUserUseCase = new CreateUserUseCase();
const loginUserUseCase = new LoginUserUseCase();
const refreshUseCase = new RefreshTokenUseCase(userRepository);
const logoutUseCase = new LogoutUserUseCase(userRepository);
const subscribeCompanyUseCase = new SubscribeCompanyUseCase();
const getUsersUseCase = new GetUsersUseCase(); // 🚀 NUEVO
const updateUserUseCase = new UpdateUserUseCase(); // 🚀 NUEVO
const deleteUserUseCase = new DeleteUserUseCase();
const resendVerificationUseCase = new ResendVerificationUseCase(); // 🚀 NUEVO
const changePasswordUseCase = new ChangePasswordUseCase(); // 🚀 INSTANCIA

// 3. 🎯 EL AJUSTE CLAVE: Exportamos la instancia lista para que securityRouter la consuma
export const userController = new UserController(
  createUserUseCase,
  loginUserUseCase,
  refreshUseCase,
  logoutUseCase,
  subscribeCompanyUseCase,
  switchContextUseCase,
  confirmEmailUseCase,
  getUsersUseCase, // 🚀 Inyectado en la posición 8
  updateUserUseCase, // 🚀 Inyectado en la posición 9
  deleteUserUseCase, // 🚀 Inyectado en la posición 10
  resendVerificationUseCase,
  changePasswordUseCase,
);

// 4. Endpoints de la API Públicos y Privados del Prefijo Base
userRouter.post(
  "/subscribe",
  catchAsync((req: any, res: any) => userController.subscribe(req, res)),
);
userRouter.post(
  "/login",
  catchAsync((req: any, res: any) => userController.login(req, res)),
);
userRouter.post(
  "/refresh",
  catchAsync((req: any, res: any) => userController.refresh(req, res)),
);
userRouter.get(
  "/confirm-email",
  catchAsync((req: any, res: any) => userController.confirmEmail(req, res)),
);

userRouter.post(
  "/logout",
  authMiddleware,
  catchAsync((req: any, res: any) => userController.logout(req, res)),
);
userRouter.post(
  "/switch-context",
  authMiddleware,
  catchAsync((req: any, res: any) => userController.switchContext(req, res)),
);

// Mantenemos tu alias anterior por compatibilidad, aunque ahora se consumirá de forma paginada por /security
userRouter.post(
  "/register-user",
  authMiddleware,
  catchAsync((req: any, res: any) => userController.registerSubUser(req, res)),
);
userRouter.post('/resend-verification', catchAsync((req:any, res:any) => userController.resendVerification(req, res)));
userRouter.post("/change-password", authMiddleware, catchAsync((req: any, res: any) => userController.updatePassword(req, res)));
export { userRouter };
