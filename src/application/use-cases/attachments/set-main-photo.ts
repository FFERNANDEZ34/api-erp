import { AttachmentModel } from '../../../infrastructure/database/models/attachment.model';
import { Op } from 'sequelize';

export class SetMainPhotoUseCase {
  async execute(params: { subscriptionId: number; attachmentId: number; relatedRecordId: number }) {
    const { subscriptionId, attachmentId, relatedRecordId } = params;

    // 1. 🔍 BUSQUEDA EN COLA DE MEMORIA: Recuperamos el archivo solicitado sin amarras de módulo
    const targetAttachment = await AttachmentModel.findOne({
      where: { id: attachmentId, subscriptionId }
    });

    if (!targetAttachment) {
      throw new Error('El archivo adjunto solicitado no existe en los repositorios de la compañía.');
    }

    // Identificamos el contexto del módulo de forma tolerante a la glosa de tu base de datos
    const currentModule = String(targetAttachment.relatedModule).toUpperCase().trim();
    const isCompanyModule = currentModule === 'COMPANIES' || currentModule === 'COMPANIAS';

    // =========================================================================
    // 🎛️ ENGRANAJE INTEGRADO: PROCESAMIENTO SEGÚN EL MÓDULO DE PROCEDENCIA
    // =========================================================================
    if (isCompanyModule) {
      const ext = String(targetAttachment.fileExtension).toLowerCase().trim();
      const isCertificate = ext === 'pfx' || ext === 'p12';

      if (isCertificate) {
        // 🔒 REGLA A (CERTIFICADOS): Apagamos la estrella a TODOS los certificados anteriores de ESTA empresa
        await AttachmentModel.update(
          { isMainPhoto: false },
          {
            where: {
              subscriptionId,
              relatedRecordId,
              relatedModule: targetAttachment.relatedModule, // Respeta la glosa con la que se grabó (COMPANIAS)
              fileExtension: { [Op.in]: ['pfx', 'p12', 'PFX', 'P12'] }
            }
          }
        );
        console.log(`🔒 [LOGÍSTICA TRANSACCIONAL] Reseteando flags de firmas criptográficas para la Empresa ID: ${relatedRecordId}`);
      } else {
        // 🖼️ REGLA B (LOGOTIPOS): Apagamos la estrella de todas las IMÁGENES anteriores de ESTA empresa
        await AttachmentModel.update(
          { isMainPhoto: false },
          {
            where: {
              subscriptionId,
              relatedRecordId,
              relatedModule: targetAttachment.relatedModule,
              fileExtension: { [Op.notIn]: ['pfx', 'p12', 'PFX', 'P12'] }
            }
          }
        );
        console.log(`🖼️ [LOGÍSTICA TRANSACCIONAL] Reseteando flags de logotipos institucionales para la Empresa ID: ${relatedRecordId}`);
      }
    } else {
      // 📦 REGLA C (PRODUCTOS): Mantiene tu comportamiento tradicional inmutable para el catálogo de ítems
      await AttachmentModel.update(
        { isMainPhoto: false },
        { 
          where: { 
            subscriptionId, 
            relatedModule: targetAttachment.relatedModule, 
            relatedRecordId 
          } 
        }
      );
      console.log(`📦 [LOGÍSTICA POS] Reseteando portada del artículo comercial ID: ${relatedRecordId}`);
    }

    // =========================================================================
    // 2. 🌟 GATILLO DE ACTIVACIÓN EXCLUSIVA
    // Le ponemos la estrella dorada únicamente al ID binario seleccionado
    // =========================================================================
    await targetAttachment.update({ isMainPhoto: true });

    console.log(`🏆 [MULTIMEDIA SINCRO] Archivo [${targetAttachment.fileName}] indexado como Principal de forma exitosa.`);

    return targetAttachment.get({ plain: true });
  }
}