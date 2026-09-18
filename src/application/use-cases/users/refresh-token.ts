import { IUserRepository } from "../../../domain/repositories/user.repository";
import jwt from "jsonwebtoken";

export class RefreshTokenUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(tokenRecibido: string): Promise<{ accessToken: string }> {
    const secret = process.env.JWT_SECRET || "secret";


    try {
      // 1. Verificar que el token sea criptográficamente válido
      const decoded = jwt.verify(tokenRecibido, secret) as { id: number };

      // 2. Verificar que exista en la BD y pertenezca al usuario correcto
       const user = await this.userRepository.findById(decoded.id); 
      
      if (!user) {
        throw new Error("Token no autorizado");
      }

      // 3. Generar un nuevo Access Token de 15 minutos
      
      const newAccessToken = jwt.sign(
        { id: user.id, 
          email: user.email, 
          role: user.role,
          subscriptionId: (user as any).subscriptionId || (decoded as any).subscriptionId },
        secret,
        { expiresIn: "5m" },
      );

      
      return { accessToken: newAccessToken };
    } catch (error: any) {
      
      throw new Error("Token de refresco inválido o expirado");
    }
  }
}
