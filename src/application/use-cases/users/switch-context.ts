import { UserCompanyRoleModel } from '../../../infrastructure/database/models/user-company-role.model';
import { CompanyModel } from '../../../infrastructure/database/models/company.model';
import { BranchWarehouseModel } from '../../../infrastructure/database/models/branch-warehouse.model';
import { RoleModel } from '../../../infrastructure/database/models/role.model';
import jwt from 'jsonwebtoken';

// 💡 SOLUCIÓN TS7015: Declaramos la interfaz con firmas de índice string explícitas
// Esto le indica a TypeScript que los objetos aceptan llaves dinámicas como 'comp_X' y 'branch_Y'
interface CompanyPermission {
  name: string;
  branches: { 
    [branchKey: string]: { 
      name: string; 
      roles: string[] 
    } 
  };
}

export class SwitchContextUseCase {
  async execute(data: { userId: number; email: string; subscriptionId: number; companyId: number; branchId: number; roleName: string }) {
    
    // 1. Si es el Administrador Maestro (ID 1), tiene bypass global automático
    const isMasterAdmin = data.userId === 1;

    if (!isMasterAdmin) {
      // 2. Buscar el ID numérico del rol que se solicita activar
      const role = await RoleModel.findOne({ where: { name: data.roleName.trim().toLowerCase() } });
      if (!role) throw new Error('El perfil operativo solicitado no existe en el catálogo maestro.');

      // 3. Validar estrictamente en MySQL que la asignación exista y le pertenezca
      const hasAssignment = await UserCompanyRoleModel.findOne({
        where: {
          subscriptionId: data.subscriptionId,
          userId: data.userId,
          companyId: data.companyId,
          branchId: data.branchId,
          roleId: role.id
        }
      });

      if (!hasAssignment) {
        throw new Error('Acceso Denegado: Su usuario no tiene autorizado operar en esta compañía o local con ese perfil.');
      }
    }

    // 4. Re-compilar la matriz de permisos incluyendo nombres reales de la BD
    const userAssignments = await UserCompanyRoleModel.findAll({
      where: { userId: data.userId },
      include: [
        { model: CompanyModel, attributes: ['name'] },
        { model: BranchWarehouseModel, attributes: ['name'] },
        { model: RoleModel, attributes: ['name'] }
      ],
      raw: true,
      nest: true
    });

    // Aplicamos la interfaz blindada contra errores de índices implícitos
    const permissionsMatrix: Record<string, CompanyPermission> = {};

    userAssignments.forEach((assignment: any) => {
      const compKey = `comp_${assignment.companyId}`;
      const branchKey = `branch_${assignment.branchId}`;
      const roleName = assignment.RoleModel.name;

      // Inyectamos el nombre real de la compañía
      if (!permissionsMatrix[compKey]) {
        permissionsMatrix[compKey] = {
          name: assignment.CompanyModel.name,
          branches: {}
        };
      }

      // Inyectamos el nombre real del local
      if (!permissionsMatrix[compKey].branches[branchKey]) {
        permissionsMatrix[compKey].branches[branchKey] = {
          name: assignment.BranchWarehouseModel.name,
          roles: []
        };
      }

      if (!permissionsMatrix[compKey].branches[branchKey].roles.includes(roleName)) {
        permissionsMatrix[compKey].branches[branchKey].roles.push(roleName);
      }
    });

    // 5. Emitir el nuevo Access Token con el contexto activo refrescado
    const secret = process.env.JWT_SECRET || 'secret';
    
    const newAccessToken = jwt.sign(
      {
        id: data.userId,
        email: data.email,
        subscriptionId: data.subscriptionId,
        isGodMode: isMasterAdmin,
        permissions: permissionsMatrix,
        activeContext: {
          companyId: data.companyId,
          branchId: data.branchId,
          role: data.roleName
        }
      },
      secret,
      { expiresIn: '5m' }
    );

    return {
      accessToken: newAccessToken
    };
  }
}