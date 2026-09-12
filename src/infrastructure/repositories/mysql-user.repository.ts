import { IUserRepository } from "../../domain/repositories/user.repository";
import { User } from "../../domain/entities/User";
import { UserModel } from "../database/models/user.model";

export class MySqlUserRepository implements IUserRepository {
  async create(user: User): Promise<User> {
    // 💡 Asegúrate de mapear explícitamente 'companyId' dentro del .create()
    const created = await UserModel.create({
      companyId: user.companyId, // 👈 ¡REVISA ESTA LÍNEA! Debe apuntar a user.companyId
      email: user.email,
      password: user.password,
      role: user.role,
    });

    return created.toJSON() as User;
  }
  async findByEmail(email: string): Promise<User | null> {
    const found = await UserModel.findOne({ where: { email } });
    return found ? (found.toJSON() as User) : null;
  }
  async findById(id: number): Promise<User | null> {
    const found = await UserModel.findByPk(id);
    return found ? (found.toJSON() as User) : null;
  }
  async updateRefreshToken(id: number, token: string | null): Promise<void> {
    await UserModel.update({ refreshToken: token }, { where: { id } });
  }
  async findByRefreshToken(token: string): Promise<User | null> {
    const found = await UserModel.findOne({ where: { refreshToken: token } });
    return found ? (found.toJSON() as User) : null;
  }
}
