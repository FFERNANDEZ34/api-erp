import { UserModel } from '../../../infrastructure/database/models/user.model';

export class DeleteUserUseCase {
  async execute(subscriptionId: number, userId: number) {
    if (userId === 1) throw new Error('Operación denegada. El fundador principal es inmutable.');

    console.log(`🔒 [BORRADO LÓGICO ACID] Inactivando usuario ID: [${userId}]`);

    // Mutamos el estado a false en lugar de disparar un DESTROY físico de filas
    const [updatedCount] = await UserModel.update(
      { isActive: false },
      { where: { id: userId, subscriptionId } }
    );

    if (updatedCount === 0) throw new Error('El usuario no pudo ser localizado o no pertenece a su holding.');

    return { success: true, message: 'Colaborador desactivado correctamente de la suite SaaS.' };
  }
}