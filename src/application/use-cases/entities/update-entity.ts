import { EntityModel } from '../../../infrastructure/database/models/entity.model';

export class UpdateEntityUseCase {
  async execute(id: number, subscriptionId: number, data: { name?: string; email?: string | null }) {
    // 🔒 Seguridad SaaS: Validamos que la entidad exista y pertenezca a la suscripción
    const entity = await EntityModel.findOne({ where: { id, subscriptionId } });
    if (!entity) throw new Error('Entidad no encontrada en su catálogo corporativo');

    // Actualizar datos permitidos
    await entity.update(data);
    return entity.toJSON();
  }
}