import { Router } from "express";
import { AttachmentController } from "../controllers/attachment.controller";
import { UploadAttachmentUseCase } from "../../../application/use-cases/attachments/upload-attachment";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { checkExchangeRateMiddleware } from "../../middlewares/check-exchange-rate.middleware";
import { uploadAttachmentMiddleware } from "../../middlewares/multer.config";
import { SetMainPhotoUseCase } from "../../../application/use-cases/attachments/set-main-photo";
const attachmentRouter = Router();

const uploadAttachmentUseCase = new UploadAttachmentUseCase();
const setMainPhotoUseCase = new SetMainPhotoUseCase();
const attachmentController = new AttachmentController(
  uploadAttachmentUseCase,
  setMainPhotoUseCase,
);

// 🚀 Endpoint de carga binaria multipart/form-data arropado por Multer y candados ERP
attachmentRouter.post(
  "/upload",
  authMiddleware,
  checkExchangeRateMiddleware,
  uploadAttachmentMiddleware.single("file"), // 'file' es el nombre clave con el que Angular enviará el binario
  (req: any, res: any) => attachmentController.upload(req, res),
);

// Endpoint de consulta de catálogos
attachmentRouter.get(
  "/",
  authMiddleware,
  checkExchangeRateMiddleware,
  (req: any, res: any) => attachmentController.getByRecord(req, res),
);

attachmentRouter.patch(
  "/:id/main",
  authMiddleware,
  checkExchangeRateMiddleware,
  (req: any, res: any) => attachmentController.setMainPhoto(req, res),
);

export { attachmentRouter };
