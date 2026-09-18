import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { CreateInvoiceUseCase } from "../../../application/use-cases/invoices/create-invoice";
import { GetInvoicesPaginatedUseCase } from "../../../application/use-cases/invoices/get-invoices-paginated";
import { CancelInvoiceUseCase } from "../../../application/use-cases/invoices/cancel-invoice";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { checkExchangeRateMiddleware } from "../../middlewares/check-exchange-rate.middleware";

const invoiceRouter = Router();

const createInvoiceUseCase = new CreateInvoiceUseCase();
const getInvoicesPaginatedUseCase = new GetInvoicesPaginatedUseCase();
const cancelInvoiceUseCase = new CancelInvoiceUseCase();

const invoiceController = new InvoiceController(
  createInvoiceUseCase,
  getInvoicesPaginatedUseCase,
  cancelInvoiceUseCase
);

// Mapeado físico de Endpoints protegidos por Sesión y Candado de Tipo de Cambio Diario
invoiceRouter.post("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => invoiceController.create(req, res));
invoiceRouter.get("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => invoiceController.getPaginated(req, res));
invoiceRouter.delete("/:id", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => invoiceController.cancel(req, res));

export { invoiceRouter };