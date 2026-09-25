import { Request, Response } from "express";
import { CreateUserUseCase } from "../../../application/use-cases/users/create-user";
import { LoginUserUseCase } from "../../../application/use-cases/users/login-user";
import { RefreshTokenUseCase } from "../../../application/use-cases/users/refresh-token";
import { LogoutUserUseCase } from "../../../application/use-cases/users/logout-user";
import { SubscribeCompanyUseCase } from "../../../application/use-cases/users/subscribe-company";
import { GetUsersUseCase } from "../../../application/use-cases/users/get-users";

import { UpdateUserUseCase } from "../../../application/use-cases/users/update-user";
import { DeleteUserUseCase } from "../../../application/use-cases/users/delete-user";
import { ResendVerificationUseCase } from "../../../application/use-cases/users/resend-verification";
import { ChangePasswordUseCase } from '../../../application/use-cases/users/change-password';

import { SwitchContextUseCase } from "../../../application/use-cases/users/switch-context";
import { ConfirmEmailUseCase } from "../../../application/use-cases/users/confirm-email"; // 🚀 1. IMPORTA TU CASO DE USO
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
    private readonly confirmEmailUseCase: ConfirmEmailUseCase, // 🚀 2. INYECTA EN EL CONSTRUCTOR
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly changePasswordUseCase:ChangePasswordUseCase
  ) {}

  // 📥 NEW API: CONFIRMACIÓN Y DESBLOQUEO DE CUENTA DESDE ANGULAR (GET /api/auth/confirm-email)
  async confirmEmail(req: Request, res: Response) {
    try {
      const confirmSchema = z.object({
        token: z
          .string()
          .min(
            10,
            "El token criptográfico proporcionado está incompleto o alterado.",
          ),
      });

      // Validamos el query param (?token=xyz) con Zod
      const query = confirmSchema.parse(req.query);

      // Despachamos de forma limpia hacia nuestro Caso de Uso ACID
      const result = await this.confirmEmailUseCase.execute(query.token);

      return res.status(200).json({
        status: "success",
        ...result,
      });
    } catch (error: any) {
      console.error(
        "🚨 [ERROR EN CAPA PRESENTACIÓN - CONFIRMACIÓN EMAIL]:",
        error.message,
      );
      return res.status(400).json({
        status: "fail",
        message:
          error.message ||
          "El token de confirmación ha expirado o es totalmente inválido.",
      });
    }
  }

  async switchContext(req: AuthenticatedRequest, res: Response) {
    const switchSchema = z.object({
      companyId: z.number().int().positive(),
      branchId: z.number().int().positive(),
      roleName: z.string().min(2),
    });

    const body = switchSchema.parse(req.body);

    const userId = req.user?.id;
    const email = req.user?.email;
    const subscriptionId = req.user?.subscriptionId;

    if (!userId || !email || !subscriptionId) {
      return res
        .status(401)
        .json({ status: "fail", message: "Sesión no válida o expirada." });
    }

    const result = await this.switchContextUseCase.execute({
      userId,
      email,
      subscriptionId,
      companyId: body.companyId,
      branchId: body.branchId,
      roleName: body.roleName,
    });

    return res.status(200).json({
      status: "success",
      message: "Contexto de trabajo actualizado correctamente.",
      data: result,
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
        .length(11, "El RUC de la compañía debe tener exactamente 11 dígitos")
        .regex(
          /^(10|15|17|20)\d{9}$/,
          "El RUC debe tener 11 dígitos numéricos y comenzar con 10, 15, 17 o 20",
        ),
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

    // 🛡️ EL CONTENEDOR TRANSMITE LA INVOCACIÓN AL USE CASE REFACTORIZADO:
    // Tu loginUserUseCase internamente consultará si isEmailConfirmed es true.
    // Si no está confirmado, lanzará un error que Zod o tu middleware de catchAsync rebotarán al front.
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
      name: z
        .string()
        .min(
          3,
          "El nombre completo es requerido para la visualización del layout",
        ),
      phone: z.string().optional(),
      address: z.string().optional(),
      password: z.string().min(6, "La contraseña requiere mínimo 6 caracteres"),
      assignments: z
        .array(
          z.object({
            companyId: z.number().int().positive(),
            branchId: z.number().int().positive(),
            roleNames: z
              .array(z.string())
              .min(1, "Debe ingresar al menos un rol"),
          }),
        )
        .min(1, "Debe asignar al usuario a al menos una compañía"),
    });

    const validatedBody = createUserSchema.parse(req.body);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId)
      return res
        .status(401)
        .json({ status: "fail", message: "No autorizado." });

    const newUser = await this.createUserUseCase.execute({
      subscriptionId,
      email: validatedBody.email,
      name: validatedBody.name,
      phone: validatedBody.phone,
      address: validatedBody.address,
      passwordUnsecured: validatedBody.password,
      assignments: validatedBody.assignments,
    });

    return res.status(201).json({
      status: "success",
      message:
        "Colaborador registrado. Se ha enviado un correo con su contraseña temporal de acceso.",
      data: newUser,
    });
  }

  async listSubUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      if (!subscriptionId)
        return res
          .status(401)
          .json({ status: "fail", message: "No autorizado." });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";

      const result = await this.getUsersUseCase.execute(
        subscriptionId,
        page,
        limit,
        search,
      );
      return res.status(200).json({ status: "success", data: result });
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  async editSubUser(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const userIdToEdit = parseInt(req.params.id);

      if (!subscriptionId || isNaN(userIdToEdit)) {
        return res.status(400).json({ status: "fail", message: "Falta identificación de cabeceras de seguridad." });
      }

      // Esquema estricto de Zod para blindar la entrada del bucle de asignaciones
      const editUserSchema = z.object({
        assignments: z.array(
          z.object({
            companyId: z.number().int().positive(),
            branchId: z.number().int().positive(),
            roleNames: z.array(z.string()).min(1, "Debe ingresar al menos un rol para este local"),
          })
        ).min(1, "Debe asignar al colaborador a al menos una compañía")
      });

      const validatedBody = editUserSchema.parse(req.body);

      // Despachamos hacia tu Caso de Uso ACID transaccional
      const result = await this.updateUserUseCase.execute({
        subscriptionId,
        userId: userIdToEdit,
        assignments: validatedBody.assignments
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('🚨 [CRASH EN EDICIÓN DE USUARIO]:', error.message);
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  // 📡 API CRUD 3: Baja Lógica del Colaborador (DELETE /api/security/subusers/:id)
  async removeSubUser(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const userIdToDelete = parseInt(req.params.id);

      if (!subscriptionId || isNaN(userIdToDelete)) {
        return res.status(400).json({ status: "fail", message: "Parámetros de auditoría corruptos o incompletos." });
      }

      // Despachamos hacia tu Caso de Uso de baja lógica (isActive = false)
      const result = await this.deleteUserUseCase.execute(subscriptionId, userIdToDelete);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('🚨 [CRASH EN BAJA LÓGICA DE USUARIO]:', error.message);
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  async resendVerification(req: Request, res: Response) {
    try {
      const schema = z.object({
        email: z.string().email("Formato de correo electrónico inválido")
      });

      const body = schema.parse(req.body);
      const result = await this.resendVerificationUseCase.execute(body.email);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('🚨 [CRASH REENVÍO EMAIL]:', error.message);
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

   async updatePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const passwordSchema = z.object({
        newPassword: z.string().min(6, "La nueva contraseña requiere mínimo 6 caracteres")
      });

      const body = passwordSchema.parse(req.body);
      const userId = req.user?.id; // Capturamos el ID seguro desde el authMiddleware

      if (!userId) return res.status(401).json({ status: "fail", message: "Sesión no válida." });

      // Sincronizamos con el caso de uso instanciado en el constructor
      
      const result = await this.changePasswordUseCase.execute(userId, body.newPassword);

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }
}
