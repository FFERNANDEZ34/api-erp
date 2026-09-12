import { UserModel } from '../../../infrastructure/database/models/user.model';
import { UserCompanyRoleModel } from '../../../infrastructure/database/models/user-company-role.model';
import { RoleModel } from '../../../infrastructure/database/models/role.model';
import { CompanyModel } from '../../../infrastructure/database/models/company.model';
import { BranchWarehouseModel } from '../../../infrastructure/database/models/branch-warehouse.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class LoginUserUseCase {
  async execute(email: string, passwordUnsecured: string) {
    // 1. Validar la existencia del usuario base
    const user = await UserModel.findOne({ where: { email } });
    if (!user) throw new Error('Credenciales incorrectas');

    // 2. Validar la contraseña encriptada
    const isPasswordValid = await bcrypt.compare(passwordUnsecured, user.password);
    if (!isPasswordValid) throw new Error('Credenciales incorrectas');

    // 3. Consultar la Matriz de Permisos (Intersección de Compañías, Locales y Roles)
    const userAssignments = await UserCompanyRoleModel.findAll({
      where: { userId: user.id },
      include: [
        { model: CompanyModel, attributes: ['id', 'name'] },
        { model: BranchWarehouseModel, attributes: ['id', 'name'] },
        { model: RoleModel, attributes: ['id', 'name'] }
      ],
      raw: true, // Optimización de rendimiento para traer datos planos ultra livianos
      nest: true // Estructura los objetos anidados de Sequelize limpiamente
    });

    // 4. Compilar los permisos de forma dinámica en un objeto indexado por Compañía y Local
    // Estructura resultante: { "comp_1": { "branch_1": ["super-admin", "cajero"] } }
    const permissionsMatrix: Record<string, Record<string, string[]>> = {};

    userAssignments.forEach((assignment: any) => {
      const compKey = `comp_${assignment.companyId}`;
      const branchKey = `branch_${assignment.branchId}`;
      const roleName = assignment.RoleModel.name;

      if (!permissionsMatrix[compKey]) {
        permissionsMatrix[compKey] = {};
      }
      if (!permissionsMatrix[compKey][branchKey]) {
        permissionsMatrix[compKey][branchKey] = [];
      }
      
      // Añadimos el rol evitando duplicados conceptuales
      if (!permissionsMatrix[compKey][branchKey].includes(roleName)) {
        permissionsMatrix[compKey][branchKey].push(roleName);
      }
    });

    // 5. Determinar si el usuario tiene super-poderes (Si es el ID 1 y es la suscripción fundadora)
    // Esto le da un bypass o "isGodMode" para interactuar como Administrador Maestro del Holding
    const isMasterAdmin = user.id === 1;

    // 6. Generar los Tokens de Seguridad (Access Token de 30 minutos)
    const secret = process.env.JWT_SECRET || 'secret';
    
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        subscriptionId: user.subscriptionId,
        isGodMode: isMasterAdmin,
        permissions: permissionsMatrix // 🔥 Inyección de la matriz agnóstica de permisos
      },
      secret,
      { expiresIn: '15m' }
    );

    // 7. Generar y almacenar el Refresh Token de larga duración (7 días)
    const refreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
    await user.update({ refreshToken });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        subscriptionId: user.subscriptionId
      }
    };
  }
}