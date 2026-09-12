import { EntityModel } from '../../../infrastructure/database/models/entity.model';
import { EntityCustomer } from '../../../domain/entities/EntityCustomer';


export class CreateEntityUseCase {
  async execute(data: Omit<EntityCustomer, 'id'>): Promise<EntityModel> {
    // Reglas de negocio para tipos de documentos en Perú
    if (data.entityType === 'empresa' && data.documentType !== 'ruc') {
      throw new Error('Las entidades de tipo empresa requieren obligatoriamente un documento RUC.');
    }
    if (data.entityType === 'persona' && data.documentType === 'ruc') {
      throw new Error('Las entidades de tipo persona deben registrarse con DNI, Pasaporte o CE.');
    }

    // Validar duplicidad únicamente dentro de la misma suscripción global
    const exists = await EntityModel.findOne({
      where: {
        subscriptionId: data.subscriptionId,
        documentType: data.documentType,
        documentNumber: data.documentNumber
      }
    });

    if (exists) {
      throw new Error(`La entidad con documento ${data.documentNumber} ya existe en su catálogo compartido.`);
    }

    return await EntityModel.create(data);
  }
}