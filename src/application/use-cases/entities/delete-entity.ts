import { EntityModel } from '../../../infrastructure/database/models/entity.model';

export class DeleteEntityUseCase {
  async execute(id: number, subscriptionId: number): Promise<void> {
    // 🔒 Seguridad SaaS: Validamos propiedad antes de destruir
    const entity = await EntityModel.findOne({ where: { id, subscriptionId } });
    if (!entity) throw new Error('Entidad no encontrada en su catálogo corporativo');

    await entity.destroy();
  }
}