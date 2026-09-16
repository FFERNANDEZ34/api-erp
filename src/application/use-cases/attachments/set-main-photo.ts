import { AttachmentModel } from '../../../infrastructure/database/models/attachment.model';

export class SetMainPhotoUseCase {
  async execute(params: { subscriptionId: number; attachmentId: number; relatedRecordId: number }) {
    const { subscriptionId, attachmentId, relatedRecordId } = params;

    // 1. 🛡️ APAGAR EN CASCADA: Quitamos la estrella a todas las fotos previas de este producto
    await AttachmentModel.update(
      { isMainPhoto: false },
      { where: { subscriptionId, relatedModule: 'PRODUCTOS', relatedRecordId } }
    );

    // 2. 🌟 ENCENDER: Le ponemos la estrella dorada exclusivamente al ID seleccionado
    const targetAttachment = await AttachmentModel.findOne({
      where: { id: attachmentId, subscriptionId, relatedModule: 'PRODUCTOS' }
    });

    if (!targetAttachment) {
      throw new Error('El archivo adjunto solicitado no existe o no pertenece a este producto.');
    }

    await targetAttachment.update({ isMainPhoto: true });
    return targetAttachment.get({ plain: true });
  }
}