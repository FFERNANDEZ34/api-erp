import { RoleMenuPermissionModel } from "../../../infrastructure/database/models/role-menu-permission.model";
import { MenuOptionModel } from "../../../infrastructure/database/models/menu-option.model";
import { RoleModel } from "../../../infrastructure/database/models/role.model";
import { Op } from "sequelize";

interface MenuNode {
  id: number;
  parentId: number | null;
  title: string;
  icon: string | null;
  path: string | null;
  children: MenuNode[];
}

export class GetAssignedMenuUseCase {
  async execute(
    subscriptionId: number,
    roleNames: string[],
  ): Promise<MenuNode[]> {
    // 1. Si el usuario es super-admin global de la suscripción, se le da acceso a TODO el catálogo plano de menús
    let menuOptionsPlain: any[] = [];

    if (roleNames.includes("super-admin")) {
      menuOptionsPlain = await MenuOptionModel.findAll({
        order: [["orderIndex", "ASC"]],
        raw: true,
      });
    } else {
      // 2. Si es empleado común, se buscan las opciones asignadas específicamente a sus roles en su Tenant
      const roles = await RoleModel.findAll({
        where: { name: { [Op.in]: roleNames } },
      });
      const roleIds = roles.map((r) => r.id);

      const permissions = await RoleMenuPermissionModel.findAll({
        where: { subscriptionId, roleId: { [Op.in]: roleIds } },
        include: [{ model: MenuOptionModel }],
        raw: true,
        nest: true,
      });

      // Extraer y eliminar duplicados de opciones en memoria si el empleado tiene múltiples roles
      const uniqueOptionsMap = new Map<number, any>();

      permissions.forEach((p: any) => {
        // 💡 CORRECCIÓN: Sequelize anida los datos usando el alias de la relación en minúsculas/camelCase.
        // Intentaremos leer 'menu_option' o 'MenuOptionModel' de forma segura.
        const menuOption = p.MenuOptionModel || p.menu_option;

        if (menuOption && menuOption.id) {
          uniqueOptionsMap.set(menuOption.id, menuOption);
        }
      });

      menuOptionsPlain = Array.from(uniqueOptionsMap.values()).sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );
    }

    // 3. ALGORITMO RECURSIVO: Construir el árbol jerárquico infinito (Padres -> Hijos -> Nietos)
    const buildTree = (parentId: number | null): MenuNode[] => {
      return menuOptionsPlain
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          id: item.id,
          parentId: item.parentId,
          title: item.title,
          icon: item.icon,
          path: item.path,
          children: buildTree(item.id), // 🔄 Llamada recursiva hacia los hijos/nietos
        }));
    };

    return buildTree(null); // Retorna los nodos raíz (los que no tienen parentId)
  }
}
