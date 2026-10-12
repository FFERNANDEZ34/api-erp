import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { CreateInvoiceUseCase } from "../../../application/use-cases/invoices/create-invoice";
import { GetInvoicesPaginatedUseCase } from "../../../application/use-cases/invoices/get-invoices-paginated";
import { CancelInvoiceUseCase } from "../../../application/use-cases/invoices/cancel-invoice";
import { DownloadXmlUseCase } from "../../../application/use-cases/invoices/download-xml.use-case";
import { RetrySunatUseCase } from "../../../application/use-cases/invoices/retry-sunat.use-case";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { checkExchangeRateMiddleware } from "../../middlewares/check-exchange-rate.middleware";

import { SunatSignerService } from "../../../infrastructure/services/sunat-signer.service";
import { SunatSoapService } from "../../../infrastructure/services/sunat-soap.service"; 
import { SunatOrchestratorService } from "../../../infrastructure/services/sunat-orchestrator.service";

import { GetInvoiceByIdUseCase } from "../../../application/use-cases/invoices/get-invoice-by-id"; // 🚀 Importación obligatoria


const invoiceRouter = Router();

// =========================================================================
// 🚀 INICIALIZACIÓN DE SERVICIOS DE INFRAESTRUCTURA FISCAL
// =========================================================================
const sunatSignerService = new SunatSignerService();
const sunatSoapService = new SunatSoapService(); // 🎯 Instanciamos el servicio SOAP core real

// Registramos el orquestador central que amarra el firmado con el flag y el disparo HTTPS
const sunatOrchestratorService = new SunatOrchestratorService(sunatSignerService, sunatSoapService);

// =========================================================================
// 🧱 INYECCIÓN DE CASOS DE USO (CLEAN ARCHITECTURE)
// =========================================================================
// Pasamos el orquestador unificado a la creación para centralizar el flujo DRY
const createInvoiceUseCase = new CreateInvoiceUseCase(); 
const getInvoicesPaginatedUseCase = new GetInvoicesPaginatedUseCase();
const cancelInvoiceUseCase = new CancelInvoiceUseCase();
const getInvoiceByIdUseCase = new GetInvoiceByIdUseCase(); 

const downloadXmlUseCase = new DownloadXmlUseCase();
const retrySunatUseCase = new RetrySunatUseCase(sunatOrchestratorService);

// =========================================================================
// 🎛️ INYECCIÓN INTEGRAL EN EL CONTROLADOR DE EXPRESIONES
// Sincronizamos los 5 Casos de Uso según el orden exacto de tu constructor
// =========================================================================
const invoiceController = new InvoiceController(
  createInvoiceUseCase,
  getInvoicesPaginatedUseCase,
  cancelInvoiceUseCase,
  retrySunatUseCase,     // 🎯 Mantenemos el orden limpio
  downloadXmlUseCase,     // 🎯 del constructor del controller
  getInvoiceByIdUseCase 
);

// =========================================================================
// 🔌 MAPEADO FÍSICO DE ENDPOINTS DEL COMPROBANTE POS
// =========================================================================
// Endpoints principales protegidos
invoiceRouter.post("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => invoiceController.create(req, res));
invoiceRouter.get("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => invoiceController.getPaginated(req, res));
invoiceRouter.delete("/:id", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => invoiceController.cancel(req, res));
invoiceRouter.get("/:id", authMiddleware, (req: any, res: any) => invoiceController.getById(req, res));



invoiceRouter.post("/:id/retry-sunat", authMiddleware, (req: any, res: any) => invoiceController.retrySunat(req, res));
invoiceRouter.get("/:id/download-xml", authMiddleware, (req: any, res: any) => invoiceController.downloadXml(req, res));

export { invoiceRouter };