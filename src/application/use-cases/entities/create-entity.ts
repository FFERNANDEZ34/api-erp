import { EntityModel } from "../../../infrastructure/database/models/entity.model";
import { EntityCustomer } from "../../../domain/entities/EntityCustomer";

export class CreateEntityUseCase {
  async execute(data: {
    subscriptionId: number;
    entityType: string;
    documentType: string;
    documentNumber: string;
    name: string;
    email: string | null;
  }): Promise<EntityModel> {

    const type = data.entityType.trim().toLowerCase();
    const docType = data.documentType.trim().toLowerCase();
    const docNumber = data.documentNumber.trim();

    // Reglas de negocio para tipos de documentos en Perú
    if (type === 'persona') {
      const allowedPersonDocs = ['dni', 'pasaporte', 'ce'];
      if (!allowedPersonDocs.includes(docType)) {
        throw new Error('Las entidades de tipo persona deben registrarse con DNI, Pasaporte o CE.');
      }
    }

    if (type === 'empresa' && docType !== 'ruc') {
      throw new Error('Las entidades de tipo empresa deben registrarse estrictamente con RUC.');
    }

    // Validar duplicidad únicamente dentro de la misma suscripción global
    const exists = await EntityModel.findOne({
      where: {
        subscriptionId: data.subscriptionId,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
      },
    });

    if (exists) {
      throw new Error(
        `La entidad con documento ${data.documentNumber} ya existe en su catálogo compartido.`,
      );
    }

    return await EntityModel.create(data);
  }
}
