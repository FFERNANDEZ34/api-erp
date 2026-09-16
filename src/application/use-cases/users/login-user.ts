import { UserModel } from "../../../infrastructure/database/models/user.model";
import { UserCompanyRoleModel } from "../../../infrastructure/database/models/user-company-role.model";
import { CompanyModel } from "../../../infrastructure/database/models/company.model";
import { BranchWarehouseModel } from "../../../infrastructure/database/models/branch-warehouse.model";
import { RoleModel } from "../../../infrastructure/database/models/role.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

interface CompanyPermission {
  name: string;
  branches: { [branchKey: string]: { name: string; roles: string[] } };
}

export class LoginUserUseCase {
  async execute(email: string, passwordUnsecured: string) {
    const user = await UserModel.findOne({ where: { email } });
    if (!user)
      throw new Error(
        "Credenciales incorrectas: El correo electrónico no está registrado.",
      );

    const isPasswordValid = await bcrypt.compare(
      passwordUnsecured,
      user.password,
    );
    if (!isPasswordValid)
      throw new Error("Credenciales incorrectas: La contraseña es inválida.");

    // Jalamos todas las asignaciones incluyendo el flag isDefault de la tabla intermedia
    const userAssignments = await UserCompanyRoleModel.findAll({
      where: { userId: user.id },
      include: [
        { model: CompanyModel, attributes: ["name"] },
        { model: BranchWarehouseModel, attributes: ["name"] },
        { model: RoleModel, attributes: ["name"] },
      ],
      raw: true,
      nest: true,
    });

    const permissionsMatrix: Record<string, CompanyPermission> = {};

    // Variables para capturar el contexto que tenga isDefault = 1
    let defaultCompanyId = 0;
    let defaultBranchId = 0;
    let defaultRoleName = "";
    let foundExplicitDefault = false; 

    userAssignments.forEach((assignment: any) => {
      const compKey = `comp_${assignment.companyId}`;
      const branchKey = `branch_${assignment.branchId}`;
      const roleName = assignment.RoleModel.name;

      if (!permissionsMatrix[compKey]) {
        permissionsMatrix[compKey] = {
          name: assignment.CompanyModel.name,
          branches: {},
        };
      }
      if (!permissionsMatrix[compKey].branches[branchKey]) {
        permissionsMatrix[compKey].branches[branchKey] = {
          name: assignment.BranchWarehouseModel.name,
          roles: [],
        };
      }
      if (
        !permissionsMatrix[compKey].branches[branchKey].roles.includes(roleName)
      ) {
        permissionsMatrix[compKey].branches[branchKey].roles.push(roleName);
      }

      if (assignment.isDefault === 1 || assignment.isDefault === true) {
        defaultCompanyId = assignment.companyId;
        defaultBranchId = assignment.branchId;
        defaultRoleName = roleName;
        foundExplicitDefault = true; // ACTIVAMOS EL CERROJO COPTURADO
      } 
      // Fallback: Si todavía no hemos encontrado el isDefault explícito, asignamos la primera opción temporalmente
      else if (!foundExplicitDefault && defaultCompanyId === 0) {
        defaultCompanyId = assignment.companyId;
        defaultBranchId = assignment.branchId;
        defaultRoleName = roleName;
      }
    });

    const secret = process.env.JWT_SECRET || "aiven_clean_architecture_secret_key_2026";
    const refreshSecret = process.env.JWT_SECRET || "aiven_clean_architecture_secret_key_2026";
    
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        subscriptionId: user.subscriptionId,
        isGodMode: user.id === 1,
        permissions: permissionsMatrix,
        // 🔥 INYECTAMOS EL CONTEXTO POR DEFECTO AUTOMÁTICO
        activeContext: {
          companyId: defaultCompanyId,
          branchId: defaultBranchId,
          role: defaultRoleName,
        },
      },
      secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any },
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      refreshSecret,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '1d') as any }
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        subscriptionId: user.subscriptionId,
      },
    };
  }
}
