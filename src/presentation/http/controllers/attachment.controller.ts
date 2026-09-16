import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { UploadAttachmentUseCase } from "../../../application/use-cases/attachments/upload-attachment";
import { AttachmentModel } from "../../../infrastructure/database/models/attachment.model";
import { SetMainPhotoUseCase } from "../../../application/use-cases/attachments/set-main-photo";

import { z } from "zod";

export class AttachmentController {
  constructor(
    private readonly uploadAttachmentUseCase: UploadAttachmentUseCase,
    private readonly setMainPhotoUseCase: SetMainPhotoUseCase,
  ) {}

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

      const setMainPhotoUseCase = new SetMainPhotoUseCase(); // Instanciación rápida
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
  // 📥 OPERACIÓN A: Cargar Fichero y Registrar Metadata (POST)
  async upload(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;

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

      // 🌟 LEEMOS DESDE HEADERS O BODY SEGÚN CORRESPONDA
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
        req.body.isMainPhoto === "true";

      if (!relatedRecordId) {
        return res.status(400).json({
          status: "fail",
          message: "El ID del registro relacionado es obligatorio.",
        });
      }

      const relativeUrl = `/storage/${relatedModule.toLowerCase()}/${req.file.filename}`;

      const savedAttachment = await this.uploadAttachmentUseCase.execute({
        subscriptionId,
        relatedModule: relatedModule as any,
        relatedRecordId: Number(relatedRecordId),
        fileName: req.file.originalname,
        fileUrl: relativeUrl,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        isMainPhoto: isMainPhoto,
      });

      return res.status(201).json({
        status: "success",
        message: "Archivo cargado con éxito.",
        data: savedAttachment,
      });
    } catch (error: any) {
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // 📑 OPERACIÓN B: Listar Adjuntos por Registro Específico (GET)
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
