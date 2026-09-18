import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { CreateInvoiceUseCase } from '../../../application/use-cases/invoices/create-invoice';
import { GetInvoicesPaginatedUseCase } from '../../../application/use-cases/invoices/get-invoices-paginated';
import { CancelInvoiceUseCase } from '../../../application/use-cases/invoices/cancel-invoice';
import { z } from 'zod';

export class InvoiceController {
  constructor(
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
    private readonly getInvoicesPaginatedUseCase: GetInvoicesPaginatedUseCase,
    private readonly cancelInvoiceUseCase: CancelInvoiceUseCase
  ) {}

  // 📥 OPERACIÓN A: Emitir y Consolidar Comprobante Atómico (POST)
  async create(req: AuthenticatedRequest, res: Response) {
    try {
      // Esquema de validación estricta para el Carrito de Compras e información Fiscal
      const invoiceSchema = z.object({
        // 🚀 COERCION DE ZOOD: Fuerza que si viaja un string de número, lo convierta a number real en la RAM
        seriesId: z.coerce.number().int("El talonario de series es obligatorio."),
        dueDate: z.string().nullable().optional(),
        customerId: z.coerce.number().int("El cliente relacionado es requerido."),
        customerIdentityType: z.string().min(1).max(2),
        customerIdentityNumber: z.string().min(1),
        customerName: z.string().min(3),
        customerAddress: z.string().nullable().optional(),
        currencyCode: z.string().min(3).max(3).default('PEN'),
        exchangeRate: z.number().min(0.0001).default(1.0000),
        totalLetras: z.string().min(5, "El importe en letras es obligatorio."),
        details: z.array(
          z.object({
            // 🚀 COERCION EN DETALLES: Limpia los IDs de los productos del carrito de compras
            productId: z.coerce.number().int("El ID del producto debe ser numérico."),
            productCode: z.string(),
            productName: z.string(),
            unitMeasureCode: z.string().default('NIU'),
            quantity: z.number().positive("La cantidad debe ser mayor a cero."),
            unitPrice: z.number().positive("El precio de venta debe ser mayor a cero."),
            taxTypeCode: z.string().default('10')
          })
        ).min(1, "El comprobante debe contener al menos un artículo en el detalle.")
      });

      // Validamos y coorcionamos los datos de la petición
      const body = invoiceSchema.parse(req.body);
      
      const subscriptionId = req.user?.subscriptionId;
      const userId = req.user?.id; // Captura el ID del cajero logueado
      const companyId = parseInt(req.headers['x-company-id'] as string);
      const branchId = parseInt(req.headers['x-branch-id'] as string || req.query.branchId as string);

      if (!subscriptionId || !userId || isNaN(companyId) || isNaN(branchId)) {
        return res.status(401).json({
          status: "fail",
          message: "Contexto transaccional inválido (Holding, Empresa, Sucursal o Usuario nulos)."
        });
      }

      const result = await this.createInvoiceUseCase.execute({
        subscriptionId,
        companyId,
        branchId,
        userId,
        ...body
      });

      return res.status(201).json({
        status: "success",
        message: `Comprobante ${result.fullDocumentNumber || 'emitido'} registrado con éxito en MySQL.`,
        data: result
      });

    } catch (error: any) {
      console.error('🚨 [ERROR CONTROLADO INVOICE]:', error);

      // Interceptamos específicamente si el error proviene de una validación fallida de Zod
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: "fail",
          message: "Error de validación en las propiedades del comprobante.",
          errors: error.errors.map(err => ({ campo: err.path.join('.'), mensaje: err.message }))
        });
      }

      // Fallback para errores generales del caso de uso o de base de datos
      return res.status(400).json({
        status: "fail",
        message: error.message || "Error interno al procesar la emisión de la venta."
      });
    }
  }

  // 📑 OPERACIÓN B: Historial de Documentos Paginado por Empresa (GET)
  async getPaginated(req: AuthenticatedRequest, res: Response) {
    const subscriptionId = req.user?.subscriptionId;
    const companyId = parseInt(req.headers['x-company-id'] as string);

    if (!subscriptionId || isNaN(companyId)) {
      return res.status(401).json({ status: "fail", message: "Identificación corporativa multi-tenant inválida." });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const filters = {
      documentType: req.query.documentType as string,
      fullDocumentNumber: req.query.fullDocumentNumber as string,
      customerName: req.query.customerName as string,
      customerIdentityNumber: req.query.customerIdentityNumber as string
    };

    const result = await this.getInvoicesPaginatedUseCase.execute({
      subscriptionId,
      companyId,
      page,
      limit,
      filters
    });

    return res.status(200).json({
      status: "success",
      data: result
    });
  }

  // 💥 OPERACIÓN C: Anulación de Comprobante / Control de Baja (DELETE)
  async cancel(req: AuthenticatedRequest, res: Response) {
    const invoiceId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;
    const companyId = parseInt(req.headers['x-company-id'] as string);

    if (!subscriptionId || isNaN(companyId) || isNaN(invoiceId)) {
      return res.status(400).json({ status: "fail", message: "Identificadores de anulación corruptos." });
    }

    const result = await this.cancelInvoiceUseCase.execute(invoiceId, subscriptionId, companyId);

    return res.status(200).json({
      status: "success",
      message: `El documento comercial ${result.fullDocumentNumber} ha sido anulado del sistema de forma segura.`,
      data: result
    });
  }
}