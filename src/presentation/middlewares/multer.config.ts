import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    // 🌟 LA SOLUCIÓN DE ORO: Leemos el módulo desde las cabeceras de la petición (headers)
    // Esto destruye el retraso por asincronía del req.body multiparte.
    const rawModule = req.headers['x-related-module'] || 'VARIOS';
    const moduleFolder = String(rawModule).toLowerCase();
    
    const uploadPath = path.join(process.cwd(), 'storage', moduleFolder);

    // 📁 Creación recursiva de carpetas físicas en el disco de Windows
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${uniqueSuffix}-${cleanName}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.xml', '.zip', '.pfx', '.p12'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Extensión de archivo ${ext} no permitida.`));
  }
};

// =========================================================================
// ☁️ CONFIGURACIÓN DE MEMORIA RAM PARA CLOUDFLARE R2 (ATTACHMENTS GLOBAL)
// Soporta imágenes, documentos XML de la SUNAT, PDFs y archivos ZIP/RAR de hasta 10MB
// =========================================================================
const cloudFileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = /jpeg|jpg|png|webp|pdf|xml|zip|rar|pfx|p12/;
  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  
  if (extName) {
    return cb(null, true);
  }
  cb(new Error('Formato denegado. Solo se permiten imágenes, PDFs, XMLs o archivos comprimidos ZIP/RAR para Cloudflare R2.'));
};

// export const uploadAttachmentMiddleware = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: { fileSize: 10 * 1024 * 1024 } // Límite defensivo de 10MB
// });



export const uploadAttachmentMiddleware = multer({
  storage: multer.memoryStorage(), // 🎯 Captura el binario en RAM sin escribir basura local en tu disco
  fileFilter: cloudFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Límite defensivo: Máximo 10MB por archivo
});