import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { UploadAttachmentUseCase } from "../../../application/use-cases/attachments/upload-attachment";
import { AttachmentModel } from "../../../infrastructure/database/models/attachment.model";
import { SetMainPhotoUseCase } from "../../../application/use-cases/attachments/set-main-photo";
import { StorageService, StorageFolderType } from "../../../infrastructure/services/storage.service"; 
import sharp from 'sharp';

import { z } from "zod";

export class AttachmentController {
  private readonly storageService: StorageService; // 🚀 2. PROPIEDAD CLOUD

  constructor(
    private readonly uploadAttachmentUseCase: UploadAttachmentUseCase,
    private readonly setMainPhotoUseCase: SetMainPhotoUseCase,
  ) {
    this.storageService = new StorageService(); // 🚀 3. INSTANCIACIÓN EN EL CONSTRUCTOR CORE
  }

  async setMainPhoto(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const attachmentId = parseInt(req.params.id);
      const relatedRecordId = parseInt(req.body.relatedRecordId);

      if (!subscriptionId || isNaN(attachmentId) || isNaN(relatedRecordId)) {
        return res
          .status(400)
          .json({
            status: "fail",
            message: "Parámetros transaccionales inválidos.",
          });
      }

      const setMainPhotoUseCase = new SetMainPhotoUseCase();
      const result = await setMainPhotoUseCase.execute({
        subscriptionId,
        attachmentId,
        relatedRecordId,
      });

      return res.status(200).json({
        status: "success",
        message: "Foto de portada principal actualizada correctamente.",
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // =========================================================================
  // 📥 OPERACIÓN A: Cargar Fichero y Registrar Metadata en Cloudflare R2
  // =========================================================================
    async upload(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyId = req.user?.activeContext?.companyId || 1; // 🎯 Extraemos el contexto de empresa del login

      if (!subscriptionId) {
        return res
          .status(401)
          .json({ status: "fail", message: "Sesión SaaS no válida." });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ status: "fail", message: "No se adjuntó ningún archivo." });
      }

      // 🌟 LEEMOS DESDE HEADERS O BODY SEGÚN CORRESPONDA (Tu lógica híbrida intacta)
      const relatedModule = (
        (req.headers["x-related-module"] as string) ||
        req.body.relatedModule ||
        "VARIOS"
      ).toUpperCase();
      
      const relatedRecordId =
        (req.headers["x-related-record-id"] as string) ||
        req.body.relatedRecordId;
        
      const isMainPhoto =
        req.headers["x-is-main-photo"] === "true" ||
        req.body.isMainPhoto === "true" ||
        req.body.isMainPhoto === true;

      if (!relatedRecordId) {
        return res.status(400).json({
          status: "fail",
          message: "El ID del registro relacionado es obligatorio.",
        });
      }

      // 🗺️ DESTRABE MAPEO EN CASCADA: Sincronizamos tu alias con las carpetas virtuales de R2
      let folderType: StorageFolderType = 'products';
      if (relatedModule === 'PRODUCTOS') folderType = 'products';
      if (relatedModule === 'ENTIDADES_CLIENTES') folderType = 'logos';
      if (relatedModule === 'FACTURACION') folderType = 'billing/xml';
      if (relatedModule === 'COMPRAS') folderType = 'billing/pdf';

      // =========================================================================
      // 🎯 ADECUACIÓN PARA EL MÓDULO DE COMPAÑÍAS (LOGOS Y CERTIFICADOS SUNAT)
      // =========================================================================
      if (relatedModule === 'COMPANIAS') {
        // Si el archivo es una imagen va a logos (para el POS), sino va a certificates (.pfx/.p12)
        folderType = req.file.mimetype.startsWith('image/') ? 'logos' : 'certificates';
      }
      // =========================================================================

      // 🧠 Inicializamos las variables de paso con los datos de Multer por defecto
      let finalBuffer = req.file.buffer;
      let finalMimeType = req.file.mimetype;
      let finalOriginalName = req.file.originalname;

      // =========================================================================
      // 📐 CORTAFUEGOS MULTIMEDIA: REDIMENSIONAMIENTO ASÍNCRONO EN MEMORIA RAM
      // Solo optimiza imágenes (Los certificados .pfx o archivos .pdf pasan crudos)
      // =========================================================================
      if (req.file.mimetype.startsWith('image/')) {
        console.log(`📸 [MOTOR SHARP] Optimizando imagen. Peso original: ${(req.file.size / 1024).toFixed(2)} KB`);

        finalBuffer = await sharp(req.file.buffer)
          .resize({
            width: relatedModule === 'COMPANIAS' ? 400 : 800, // 📐 Logos a 400px (ideal para tiqueteras) y productos a 800px
            height: relatedModule === 'COMPANIAS' ? 400 : 800,
            fit: 'inside',     
            withoutEnlargement: true 
          })
          .jpeg({ quality: 80, progressive: true }) 
          .toBuffer();

        finalMimeType = 'image/jpeg';
        
        const baseName = req.file.originalname.substring(0, req.file.originalname.lastIndexOf('.')) || req.file.originalname;
        finalOriginalName = `${baseName}.jpg`;

        console.log(`⚡ [SHARP SUCCESS] Peso final comprimido en RAM: ${(finalBuffer.length / 1024).toFixed(2)} KB`);
      }
      // =========================================================================

      // Sanitizamos el nombre físico estampando una marca Unix ultra-única para Cloudflare
      const fileExtension = finalOriginalName.split('.').pop() || 'jpg';
      const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;

      // ☁️ ACCIÓN 1: SUBIDA DE SOCKETS ASÍNCRONA EN LA RED DE CLOUDFLARE R2
      const publicUrl = await this.storageService.uploadFile(
        subscriptionId,
        Number(companyId),
        folderType,
        cleanFileName,
        finalBuffer, 
        finalMimeType
      );

      // 💾 ACCIÓN 2: CONSOLIDACIÓN DE FILA EN MYSQL PASANDO TU URL CLOUD DEFINITIVA
      const savedAttachment = await this.uploadAttachmentUseCase.execute({
        subscriptionId,
        relatedModule: relatedModule as any,
        relatedRecordId: Number(relatedRecordId),
        fileName: finalOriginalName, 
        fileUrl: publicUrl, // 🎯 URL pública directa de Cloudflare R2
        mimeType: finalMimeType,
        fileSize: finalBuffer.length, 
        isMainPhoto: isMainPhoto,
      });

      return res.status(201).json({
        status: "success",
        message: "Archivo procesado y guardado con éxito absoluto en Cloudflare R2.",
        data: savedAttachment,
      });
    } catch (error: any) {
      console.error('🚨 [R2 ATTACHMENT CONTROLLER CRASH]:', error.message);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // 📑 OPERACIÓN B: Listar Adjuntos por Registro Específico (GET) — Totalmente Intacto
  async getByRecord(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const { module, recordId } = req.query;

      if (!subscriptionId || !module || !recordId) {
        return res.status(400).json({
          status: "fail",
          message: "Parámetros de consulta multimedia insuficientes.",
        });
      }

      const attachments = await AttachmentModel.findAll({
        where: {
          subscriptionId,
          relatedModule: (module as string).toUpperCase(),
          relatedRecordId: Number(recordId),
        },
        order: [
          ["isMainPhoto", "DESC"],
          ["id", "ASC"],
        ],
        raw: true,
      });

      return res.status(200).json({
        status: "success",
        data: attachments,
      });
    } catch (error: any) {
      return res.status(500).json({ status: "error", message: error.message });
    }
  }
}