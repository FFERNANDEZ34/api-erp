import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { CreateSeriesUseCase } from '../../../application/use-cases/series/create-series';
import { UpdateSeriesUseCase } from '../../../application/use-cases/series/update-series';
import { GetSeriesPaginatedUseCase } from '../../../application/use-cases/series/get-series-paginated';
import { DeleteSeriesUseCase } from '../../../application/use-cases/series/delete-series';
import { DocumentSeriesModel } from '../../../infrastructure/database/models/document-series.model';
import { z } from 'zod';

export class SeriesController {
  constructor(
    private readonly createSeriesUseCase: CreateSeriesUseCase,
    private readonly getSeriesPaginatedUseCase: GetSeriesPaginatedUseCase,
    private readonly updateSeriesUseCase: UpdateSeriesUseCase,
    private readonly deleteSeriesUseCase: DeleteSeriesUseCase
  ) {}

  // 📥 OPERACIÓN A: Registrar Nueva Serie / Talonario (POST)
  async create(req: AuthenticatedRequest, res: Response) {
    const seriesSchema = z.object({
      documentType: z.string().min(2, "El tipo de documento es obligatorio."),
      series: z.string().min(2).max(4, "La serie debe contener entre 2 y 4 caracteres."),
      currentNumber: z.number().int().min(0).default(0),
      description: z.string().nullable().optional(),
      branchId: z.number().int().nullable().optional()
    });

    const body = seriesSchema.parse(req.body);
    const subscriptionId = req.user?.subscriptionId;
    const companyId = parseInt(req.headers['x-company-id'] as string);

    if (!subscriptionId || isNaN(companyId)) {
      return res.status(401).json({
        status: "fail",
        message: "Seguridad Multi-Tenant: Contexto de Holding o Empresa no válido."
      });
    }

    const newSeries = await this.createSeriesUseCase.execute({
      subscriptionId,
      companyId,
      ...body
    });

    return res.status(201).json({
      status: "success",
      message: "Talonario indexado correctamente en el sistema.",
      data: newSeries
    });
  }

  // 📝 OPERACIÓN B: Modificar Parámetros de la Serie (PUT)
  async update(req: AuthenticatedRequest, res: Response) {
    const seriesId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId || isNaN(seriesId)) {
      return res.status(400).json({ status: "fail", message: "Identificadores inválidos." });
    }

    // 🕵️‍♂️ Control de Existencia Previa
    const exists = await DocumentSeriesModel.findOne({ where: { id: seriesId, subscriptionId } });
    if (!exists) {
      return res.status(404).json({
        status: "fail",
        message: `Operación cancelada: No se encontró la serie con ID #${seriesId}.`
      });
    }

    const updateSchema = z.object({
      currentNumber: z.number().int().min(0).optional(),
      description: z.string().nullable().optional(),
      branchId: z.number().int().nullable().optional()
    });

    const body = updateSchema.parse(req.body);

    const updated = await this.updateSeriesUseCase.execute(seriesId, subscriptionId, body);

    return res.status(200).json({
      status: "success",
      message: "Configuración del talonario actualizada.",
      data: updated
    });
  }

  // 📑 OPERACIÓN C: Listado Paginado Aislado por Empresa (GET)
  async getPaginated(req: AuthenticatedRequest, res: Response) {
    const subscriptionId = req.user?.subscriptionId;
    const companyId = parseInt(req.headers['x-company-id'] as string);

    if (!subscriptionId || isNaN(companyId)) {
      return res.status(401).json({ status: "fail", message: "Contexto comercial no válido." });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const filters = {
      documentType: req.query.documentType as string,
      series: req.query.series as string
    };

    const result = await this.getSeriesPaginatedUseCase.execute({
      subscriptionId,
      companyId, // 🔒 Candado de aislamiento
      page,
      limit,
      filters
    });

    return res.status(200).json({
      status: "success",
      data: result
    });
  }

  // 💥 OPERACIÓN D: Baja Lógica (DELETE)
  async delete(req: AuthenticatedRequest, res: Response) {
    const seriesId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId || isNaN(seriesId)) {
      return res.status(400).json({ status: "fail", message: "Parámetros inválidos." });
    }

    // 🕵️‍♂️ Control de Existencia Previa
    const exists = await DocumentSeriesModel.findOne({ where: { id: seriesId, subscriptionId } });
    if (!exists) {
      return res.status(404).json({ status: "fail", message: "El talonario solicitado no existe." });
    }

    await this.deleteSeriesUseCase.execute(seriesId, subscriptionId);

    return res.status(200).json({
      status: "success",
      message: "Talonario dado de baja lógicamente con éxito."
    });
  }
}