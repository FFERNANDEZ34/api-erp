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

export const uploadAttachmentMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Límite defensivo de 10MB
});