import { RoleMenuPermissionModel } from "../../../infrastructure/database/models/role-menu-permission.model";
import { MenuOptionModel } from "../../../infrastructure/database/models/menu-option.model";
import { RoleModel } from "../../../infrastructure/database/models/role.model";
import { SubscriptionApplicationModel } from "../../../infrastructure/database/models/subscription-application.model";

export class GetAssignedMenuUseCase {
  async execute(data: {
    subscriptionId: number;
    permissionsMatrix: any;
    companyId: number;
    branchId: number;
    roleName?: string;
  }) {
    const companyKey = `comp_${data.companyId}`;
    const branchKey = `branch_${data.branchId}`;

    const companyData = data.permissionsMatrix?.[companyKey] || {
      branches: {},
    };
    const branchesMap = companyData.branches || {};
    const branchData = branchesMap[branchKey] || { roles: [] };
    const assignedRoles: string[] = branchData.roles || [];

    if (assignedRoles.length === 0) return [];

    // 🎯 ¡LA MAGIA DE AISLAMIENTO AQUÍ!:
    // Si el frontend nos envía un rol seleccionado específico, usamos ese.
    // Si no viene, usamos por defecto el primero que encuentre para no romper el arranque.
    const activeRoleToFilter =
      data.roleName && assignedRoles.includes(data.roleName)
        ? data.roleName
        : assignedRoles[0];

    // 1. Buscar ÚNICAMENTE el ID numérico del perfil activo (Evita mezclar super-admin con supervisor)
    const rolesInDb = await RoleModel.findAll({
      where: { name: activeRoleToFilter }, // 👈 Cambiado de 'assignedRoles' (Arreglo) a 'activeRoleToFilter' (String plano)
      raw: true,
    });
    const roleIds = rolesInDb.map((r) => r.id);

    if (roleIds.length === 0) return [];

    // 2. Buscar relaciones en role_menu_permissions usando CamelCase
    const allowedPermissions = await RoleMenuPermissionModel.findAll({
      where: {
        subscriptionId: data.subscriptionId,
        roleId: roleIds, // 👈 Filtrará estrictamente por el ID del rol seleccionado
      },
      raw: true,
    });

    const menuOptionIds = allowedPermissions
      .map((p: any) => p.menuOptionId)
      .filter(Boolean);

    if (menuOptionIds.length === 0) return [];

    // =========================================================================
    // 🎯 PASO 3: EL DESTRABE CROSS-TENANT INTEGRADO (INNER JOIN EN MEMORIA RAM)
    // Extraemos las aplicaciones que este Tenant tiene activas en su suscripción
    // =========================================================================
    const activeApps = await SubscriptionApplicationModel.findAll({
      where: { subscriptionId: data.subscriptionId },
      raw: true,
    });
    const activeAppIds = activeApps.map((app) => app.applicationId);

    if (activeAppIds.length === 0) return []; // Si no tiene módulos activos, el menú nace vacío

    // Jalar físicamente las opciones que pasaron el filtro de roles Y pertenecen a una app contratada
    const dbMenuOptions = await MenuOptionModel.findAll({
      where: {
        id: menuOptionIds,
        applicationId: activeAppIds, // 🔌 FILTRO CRUZADO: Solo apps con licencia activa
      },
      raw: true,
    });
    // =========================================================================

    // 4. Aplanar el payload para evitar desajustes de prefijos en Angular
    const flatMenuOptions = dbMenuOptions.map((option: any) => {
      return {
        id: option.id,
        parentId:
          option.parentId !== undefined
            ? option.parentId
            : option.parent_id || null,
        title: option.title,
        icon: option.icon,
        path: option.path,
      };
    });

    return this.buildMenuTree(flatMenuOptions);
  }

  private buildMenuTree(options: any[]): any[] {
    const cache: Record<number, any> = {};
    const rootNodes: any[] = [];
    const uniqueOptions = Array.from(
      new Map(options.map((item) => [item.id, item])).values(),
    );

    uniqueOptions.forEach((opt) => {
      cache[opt.id] = { ...opt, children: [] };
    });

    uniqueOptions.forEach((opt) => {
      const mappedNode = cache[opt.id];
      if (!mappedNode) return;

      const pId = mappedNode.parentId;
      if (pId === null || pId === undefined) {
        rootNodes.push(mappedNode);
      } else {
        const parent = cache[pId];
        if (parent) {
          parent.children.push(mappedNode);
        } else {
          rootNodes.push(mappedNode);
        }
      }
    });

    return rootNodes;
  }
}
