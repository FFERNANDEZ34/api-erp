import { Request, Response } from "express";
import { CreateUserUseCase } from "../../../application/use-cases/users/create-user";
import { LoginUserUseCase } from "../../../application/use-cases/users/login-user";
import { RefreshTokenUseCase } from "../../../application/use-cases/users/refresh-token";
import { LogoutUserUseCase } from "../../../application/use-cases/users/logout-user";
import { SubscribeCompanyUseCase } from "../../../application/use-cases/users/subscribe-company";
import { SwitchContextUseCase } from "../../../application/use-cases/users/switch-context";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { z } from "zod";

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUserUseCase: LogoutUserUseCase,
    private readonly subscribeCompanyUseCase: SubscribeCompanyUseCase,
    private readonly switchContextUseCase: SwitchContextUseCase,
  ) {}

   async switchContext(req: AuthenticatedRequest, res: Response) {
    const switchSchema = z.object({
      companyId: z.number().int().positive(),
      branchId: z.number().int().positive(),
      roleName: z.string().min(2)
    });

    const body = switchSchema.parse(req.body);
    
    const userId = req.user?.id;
    const email = req.user?.email;
    const subscriptionId = req.user?.subscriptionId;

    if (!userId || !email || !subscriptionId) {
      return res.status(401).json({ status: 'fail', message: 'Sesión no válida o expirada.' });
    }

    const result = await this.switchContextUseCase.execute({
      userId,
      email,
      subscriptionId,
      companyId: body.companyId,
      branchId: body.branchId,
      roleName: body.roleName
    });

    return res.status(200).json({
      status: 'success',
      message: 'Contexto de trabajo actualizado correctamente.',
      data: result
    });
  }

  // 🏢 REGISTRO INICIAL: Suscripción Avanzada y Auto-Ecosistema (Público)
  async subscribe(req: Request, res: Response) {
    const subscribeSchema = z.object({
      contactName: z.string().min(3, "El nombre del contacto es requerido"),
      contactEmail: z.string().email("Formato de email inválido"),
      password: z.string().min(6, "La contraseña requiere mínimo 6 caracteres"),
      companyName: z
        .string()
        .min(2, "El nombre de su primera compañía es obligatorio"),
      companyRuc: z
        .string()
        .length(11, "El RUC de la compañía debe tener exactamente 11 dígitos"),
      employeeCount: z.number().min(1, "Debe registrar al menos 1 empleado"),
    });

    const body = subscribeSchema.parse(req.body);

    const result = await this.subscribeCompanyUseCase.execute({
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      passwordUnsecured: body.password,
      companyName: body.companyName,
      companyRuc: body.companyRuc,
      employeeCount: body.employeeCount,
    });

    return res.status(201).json(result);
  }

  // 🔑 AUTENTICACIÓN: Iniciar Sesión (Público)
  async login(req: Request, res: Response) {
    const loginSchema = z.object({
      email: z.string().email("Formato de correo inválido"),
      password: z.string(),
    });

    const body = loginSchema.parse(req.body);
    const tokens = await this.loginUserUseCase.execute(
      body.email,
      body.password,
    );

    return res.status(200).json(tokens);
  }

  // 🔄 REFRESH: Renovar Access Token (Público)
  async refresh(req: Request, res: Response) {
    const schema = z.object({ refreshToken: z.string() });
    const body = schema.parse(req.body);

    const result = await this.refreshTokenUseCase.execute(body.refreshToken);
    return res.status(200).json(result);
  }

  // 🔒 LOGOUT: Cerrar Sesión (Protegido)
  async logout(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    const accessToken = req.headers.authorization?.split(" ")[1];

    if (!userId || !accessToken) {
      return res
        .status(401)
        .json({ status: "fail", message: "Token no autorizado" });
    }

    await this.logoutUserUseCase.execute(userId, accessToken);
    return res
      .status(200)
      .json({ message: "Sesión cerrada con éxito. Token revocado." });
  }

  // 🔒 REGISTRO MULTI-EMPRESA: Crear Empleados con Asignaciones Libres (Protegido)
  async registerSubUser(req: AuthenticatedRequest, res: Response) {
    const createUserSchema = z.object({
      email: z.string().email("Formato de correo inválido"),
      password: z.string().min(6, "La contraseña requiere mínimo 6 caracteres"),
      assignments: z
        .array(
          z.object({
            companyId: z.number().int().positive(),
            branchId: z.number().int().positive(),
            roleNames: z
              .array(z.string())
              .min(1, "Debe ingresar al menos un rol para este local"),
          }),
        )
        .min(1, "Debe asignar al usuario a al menos una compañía"),
    });

    const validatedBody = createUserSchema.parse(req.body);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) {
      return res
        .status(401)
        .json({
          status: "fail",
          message: "No autorizado: Suscripción no válida.",
        });
    }

    // ✅ LLAMADO LIMPIO Y SINCRONIZADO: Despachamos solo las variables que el caso de uso requiere
    const newUser = await this.createUserUseCase.execute({
      subscriptionId: subscriptionId,
      email: validatedBody.email,
      passwordUnsecured: validatedBody.password,
      assignments: validatedBody.assignments,
    });

    return res.status(201).json({
      status: "success",
      message:
        "Colaborador registrado y asignado a sus respectivas compañías y locales con éxito.",
      data: newUser,
    });
  }
}
