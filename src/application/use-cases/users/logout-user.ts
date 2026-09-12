import { IUserRepository } from '../../../domain/repositories/user.repository';
import { BlacklistModel } from '../../../infrastructure/database/models/blacklist.model';
import jwt from 'jsonwebtoken';

export class LogoutUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: number, accessToken: string): Promise<void> {
    // 1. Revocar el Refresh Token en la tabla de usuarios
    await this.userRepository.updateRefreshToken(userId, null);

    try {
      // 2. Calcular el tiempo de expiración original del Access Token
      const decoded = jwt.decode(accessToken) as { exp: number };
      
      if (decoded && decoded.exp) {
        // Convertimos el timestamp Unix (segundos) de exp a un objeto Date de JS
        const expiryDate = new Date(decoded.exp * 1000);

        // Guardamos el token en la lista negra de MySQL si aún no ha expirado
        if (expiryDate > new Date()) {
          await BlacklistModel.create({
            token: accessToken,
            expiresAt: expiryDate
          });
        }
      }
    } catch (error) {
      console.error('Error al registrar en la lista negra de MySQL:', error);
    }
  }
}