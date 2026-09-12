import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { GetAssignedMenuUseCase } from "../../../application/use-cases/menus/get-assigned-menu";
import { GrantMenuPermissionsUseCase } from "../../../application/use-cases/menus/grant-menu-permissions";
import { z } from "zod";

export class MenuController {
  constructor(
    private readonly getAssignedMenuUseCase: GetAssignedMenuUseCase,
    private readonly grantMenuPermissionsUseCase: GrantMenuPermissionsUseCase,
  ) {}

  async grantPermissions(req: AuthenticatedRequest, res: Response) {
    const schema = z.object({
      roleName: z.string().min(2),
      menuOptionIds: z.array(z.number().int().positive()), // Valida la matriz masiva de enteros
    });

    const body = schema.parse(req.body);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) throw new Error("Sesión inválida.");

    const result = await this.grantMenuPermissionsUseCase.execute({
      subscriptionId,
      roleName: body.roleName,
      menuOptionIds: body.menuOptionIds,
    });

    return res.status(200).json(result);
  }

  async getUserMenu(req: AuthenticatedRequest, res: Response) {
    const subscriptionId = req.user?.subscriptionId;
    const activeCompanyId = req.headers["x-company-id"] as string;
    const isGodMode = req.user?.isGodMode;

    if (!subscriptionId) {
      return res
        .status(401)
        .json({ status: "fail", message: "Sesión no válida." });
    }

    let activeRoles: string[] = [];

    // Si es el Administrador Fundador o tiene permisos explícitos de super-admin

    if (isGodMode) {
      activeRoles = ["super-admin"];
    } else {
      if (!activeCompanyId) {
        return res.status(400).json({
          status: "fail",
          message: "Se requiere la cabecera x-company-id.",
        });
      }

      // Extraemos los roles específicos de esta empresa
      const companyKey = `comp_${activeCompanyId}`;

      // Obtenemos todos los roles de todos los locales de esa empresa y los unificamos en un solo array plano
      const companyBranches = req.user?.permissions?.[companyKey] || {};

      // Recorremos los locales de la empresa para consolidar los roles que tiene asignados
      activeRoles = Object.values(companyBranches).flat();
    }

    const menuTree = await this.getAssignedMenuUseCase.execute(
      subscriptionId,
      activeRoles,
    );

    return res.status(200).json({
      status: "success",
      data: menuTree,
    });
  }
}
