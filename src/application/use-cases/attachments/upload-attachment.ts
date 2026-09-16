import { AttachmentModel } from '../../../infrastructure/database/models/attachment.model';
import path from 'path';

export interface UploadAttachmentInput {
  subscriptionId: number;
  relatedModule: 'PRODUCTOS' | 'ENTIDADES_CLIENTES' | 'COMPRAS' | 'FACTURACION';
  relatedRecordId: number;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  isMainPhoto?: boolean;
}

export class UploadAttachmentUseCase {
  async execute(data: UploadAttachmentInput) {
    const fileExtension = path.extname(data.fileName).replace('.', '').toLowerCase();

    // Si se marca como foto de portada principal (catálogo de productos), 
    // apagamos preventivamente cualquier otra foto principal previa de este mismo registro
    if (data.isMainPhoto && data.relatedModule === 'PRODUCTOS') {
      await AttachmentModel.update(
        { isMainPhoto: false },
        { where: { subscriptionId: data.subscriptionId, relatedModule: 'PRODUCTOS', relatedRecordId: data.relatedRecordId } }
      );
    }

    const newAttachment = await AttachmentModel.create({
      subscriptionId: data.subscriptionId,
      relatedModule: data.relatedModule.toUpperCase(),
      relatedRecordId: Number(data.relatedRecordId),
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      fileExtension: fileExtension,
      fileSize: data.fileSize,
      isMainPhoto: data.isMainPhoto || false
    });

    return newAttachment.get({ plain: true });
  }
}