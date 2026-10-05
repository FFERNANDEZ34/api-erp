import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 🎯 SINCRO DE CAPA REAL: Calculamos la raíz saliendo desde src/presentation/middlewares/
const uploadDir = path.join(__dirname, '../../../uploads/vouchers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Estampamos una marca de tiempo Unix única para evitar colisiones de archivos de red
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExt = path.extname(file.originalname);
    cb(null, `VOUCHER-${uniqueSuffix}${fileExt}`);
  }
});

// Filtro de seguridad: Solo permitimos PDFs e Imágenes (JPG, PNG)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }
  cb(new Error('Formato denegado. Solo se permite adjuntar imágenes (JPG, PNG) o archivos PDF.'));
};

export const uploadVoucherMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Tope máximo de 5MB por voucher
});


// =========================================================================
// ☁️ NUEVA INYECCIÓN CLOUD: MIDDLEWARE EN MEMORIA RAM PARA CLOUDFLARE R2
// Admite imágenes y documentos de facturación (XML, PDF, ZIP, RAR) de hasta 10MB
// =========================================================================
const cloudFileFilter = (req: any, file: any, cb: any) => {
  // Permitimos imágenes, documentos oficiales XML, constancias CDR (ZIP/RAR) y PDFs
  const allowedExtensions = /jpeg|jpg|png|webp|pdf|xml|zip|rar/;
  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  
  if (extName) {
    return cb(null, true);
  }
  cb(new Error('Formato denegado para Cloudflare R2. Solo se permiten imágenes, PDFs, XMLs o archivos comprimidos ZIP/RAR.'));
};

export const uploadMemoryMiddleware = multer({
  storage: multer.memoryStorage(), // 🎯 Captura en RAM para transferir directo a R2
  fileFilter: cloudFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 🔒 Tope de seguridad: Máximo 10MB para XMLs/ZIPs grandes
});