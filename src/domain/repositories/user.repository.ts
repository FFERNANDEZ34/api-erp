import { User } from "../entities/User";
export interface IUserRepository {
  create(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  updateRefreshToken(id: number, token: string | null): Promise<void>;
  findByRefreshToken(token: string): Promise<User | null>;
}
