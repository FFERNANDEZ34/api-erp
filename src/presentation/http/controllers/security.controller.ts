import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AssignRolePermissionsUseCase } from '../../../application/use-cases/security/assign-role-permissions';
import { RoleModel } from '../../../infrastructure/database/models/role.model';
import { RoleMenuPermissionModel } from '../../../infrastructure/database/models/role-menu-permission.model';
import { MenuOptionModel } from '../../../infrastructure/database/models/menu-option.model'; 

import { CreateRoleUseCase } from '../../../application/use-cases/roles/create-role.use-case';
import { GetRolesUseCase } from '../../../application/use-cases/roles/get-roles.use-case';
import { UpdateRoleUseCase } from '../../../application/use-cases/roles/update-role.use-case';
import { DeleteRoleUseCase } from '../../../application/use-cases/roles/delete-role.use-case';

import { z } from 'zod';


export class SecurityController {
  constructor(
    private readonly assignRolePermissionsUseCase: AssignRolePermissionsUseCase,
     private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly getRolesUseCase: GetRolesUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase
  ) {}

  // 📝 1. API: Listar todos los Roles de la Empresa (GET /security/roles)
  async getRoles(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyId = parseInt(req.headers['x-company-id'] as string);

      if (!subscriptionId || isNaN(companyId)) {
        return res.status(401).json({ status: "fail", message: "Contexto Multi-tenant inválido." });
      }

      const roles = await RoleModel.findAll({
        where: { subscriptionId, companyId, isActive: true },
        order: [['name', 'ASC']],
        raw: true
      });

      return res.status(200).json({ status: "success", data: roles });
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  // 🕵️‍♂️ 2. API: Obtener la Matriz Cruzada de Permisos Activos de un Rol (GET /security/permissions/:roleId)
  // Devuelve todo el árbol de menús e indica qué IDs ya tiene checkeados el rol en la BD
  async getRolePermissionsMatrix(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const roleId = parseInt(req.params.roleId);

      if (!subscriptionId || isNaN(roleId)) {
        return res.status(400).json({ status: "fail", message: "Parámetros de auditoría corruptos." });
      }

      // A. Jalamos todas las opciones de menú que existen de forma global en el sistema
      // (Asegúrate de cambiar MenuOptionModel por el nombre real de tu modelo de menús)
      const allMenuOptions = await (MenuOptionModel as any).findAll({
        order: [['orderIndex', 'ASC']],
        raw: true
      });

      // B. Jalamos qué checks tiene guardados este rol en tu tabla 'role_menu_permissions'
      const activePermissions = await RoleMenuPermissionModel.findAll({
        where: { roleId, subscriptionId },
        attributes: ['menuOptionId'],
        raw: true
      });

      const checkedIds = activePermissions.map(p => p.menuOptionId);

      return res.status(200).json({
        status: "success",
        data: {
          allMenuOptions, // Lista completa para renderizar el árbol de checks
          checkedMenuOptionIds: checkedIds // Array de números [1, 3, 5] para encender los checks en Angular
        }
      });
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  // 💾 3. API: Guardado Masivo Transaccional de Checks (POST /security/permissions)
  async saveRolePermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyId = parseInt(req.headers['x-company-id'] as string);
      
      const { roleId, menuOptionIds } = req.body;

      if (!subscriptionId || isNaN(companyId) || !roleId) {
        return res.status(401).json({ status: "fail", message: "Falta identificación de cabeceras de seguridad." });
      }

      const result = await this.assignRolePermissionsUseCase.execute({
        subscriptionId,
        companyId,
        roleId: parseInt(roleId),
        menuOptionIds: Array.isArray(menuOptionIds) ? menuOptionIds : []
      });

      return res.status(200).json({
        status: "success",
        ...result
      });
    } catch (error: any) {
      console.error('🚨 [ERROR CORTAFUEGOS SEGURIDAD]:', error.message);
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  //----------------------------------------------------------//
  // 📡 API ROLES 1: Catálogo Paginado por Empresa (GET /api/security/roles-paginated)
  async listRolesPaged(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyId = req.user?.activeContext?.companyId || req.body.companyId; // Captura el contexto activo inyectado en tu token de login

      if (!subscriptionId || !companyId) {
        return res.status(401).json({ status: "fail", message: "Falta identificación de contexto multi-tenant." });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';

      const result = await this.getRolesUseCase.execute(subscriptionId, companyId, page, limit, search);
      return res.status(200).json({ status: "success", data: result });
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  // 📡 API ROLES 2: Crear Perfil en la Empresa (POST /api/security/roles)
  async createNewRole(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyId = req.user?.activeContext?.companyId || req.body.companyId;

      if (!subscriptionId || !companyId) {
        return res.status(401).json({ status: "fail", message: "Falta identificación de contexto multi-tenant." });
      }

      const roleSchema = z.object({ 
        name: z.string().min(3, "El nombre del perfil requiere mínimo 3 caracteres"),
        description: z.string().max(255, "La descripción no puede superar los 255 caracteres").optional()
      });
      const body = roleSchema.parse(req.body);

      const result = await this.createRoleUseCase.execute(subscriptionId, companyId, body.name, body.description);
      return res.status(201).json({ status: "success", message: "Perfil corporativo fundado con éxito.", data: result });
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  // 📡 API ROLES 3: Editar Nombre y Descripción (PUT /api/security/roles/:id)
  async editRole(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyId = req.user?.activeContext?.companyId || req.body.companyId;
      const roleId = parseInt(req.params.id);

      if (!subscriptionId || !companyId || isNaN(roleId)) {
        return res.status(400).json({ status: "fail", message: "Parámetros corruptos." });
      }

      const roleSchema = z.object({ 
        name: z.string().min(3, "El nombre del perfil requiere mínimo 3 caracteres"),
        description: z.string().max(255, "La descripción no puede superar los 255 caracteres").optional()
      });
      const body = roleSchema.parse(req.body);

      const result = await this.updateRoleUseCase.execute(subscriptionId, companyId, roleId, body.name, body.description);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }

  // 📡 API ROLES 4: Baja Lógica por Empresa (DELETE /api/security/roles/:id)
  async inactivateRole(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyId = req.user?.activeContext?.companyId || req.body.companyId;
      const roleId = parseInt(req.params.id);

      if (!subscriptionId || !companyId || isNaN(roleId)) {
        return res.status(400).json({ status: "fail", message: "Parámetros corruptos." });
      }

      const result = await this.deleteRoleUseCase.execute(subscriptionId, companyId, roleId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ status: "fail", message: error.message });
    }
  }
}