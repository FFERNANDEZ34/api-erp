import { IUserRepository } from "../../../domain/repositories/user.repository";
import jwt from "jsonwebtoken";

export class RefreshTokenUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(tokenRecibido: string): Promise<{ accessToken: string }> {
    const secret = process.env.JWT_SECRET || "secret";

    console.log(
      "=============== 🕵️‍♂️ RADAR: REFRESH TOKEN USE CASE ===============",
    );
    console.log(
      "1. Longitud del Refresh Token recibido:",
      tokenRecibido ? tokenRecibido.length : 0,
    );
    console.log("2. SecretKey utilizada para la verificación:", secret);

    try {
      // 1. Verificar que el token sea criptográficamente válido
      const decoded = jwt.verify(tokenRecibido, secret) as { id: number };

      console.log("3. ✅ ¡Descifrado exitoso! Payload contenido:", decoded);
      console.log(
        "4. Consultando estado del Usuario ID:",
        decoded.id,
        "en MySQL...",
      );

      // 2. Verificar que exista en la BD y pertenezca al usuario correcto
       const user = await this.userRepository.findById(decoded.id); 
      
      if (!user) {
        console.error("❌ Error: El usuario no existe en la base de datos.");
        throw new Error("Token no autorizado");
      }

      // 3. Generar un nuevo Access Token de 15 minutos
      console.log(
        "5. Generando nuevo Access Token corto (2m) con la misma llave...",
      );

      const newAccessToken = jwt.sign(
        { id: user.id, 
          email: user.email, 
          role: user.role,
          subscriptionId: (user as any).subscriptionId || (decoded as any).subscriptionId },
        secret,
        { expiresIn: "5m" },
      );

      console.log("🔓 [ÉXITO]: Nuevo Access Token despachado al Frontend.");
      console.log(
        "================================================================",
      );
      return { accessToken: newAccessToken };
    } catch (error: any) {
      console.error("💥 [ALERTA DE DESPLOME EN JWT.VERIFY]:");
      console.error(`   👉 Tipo de error: ${error.name}`);
      console.error(`   👉 Mensaje nativo: ${error.message}`);
      console.log(
        "================================================================",
      );
      throw new Error("Token de refresco inválido o expirado");
    }
  }
}
