import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { CreateBranchUseCase } from '../../../application/use-cases/branches/create-branch';
import { GetBranchesUseCase } from '../../../application/use-cases/branches/get-branches';
import { UpdateBranchUseCase } from '../../../application/use-cases/branches/update-branch';
import { DeleteBranchUseCase } from '../../../application/use-cases/branches/delete-branch';
import { BranchWarehouseModel } from '../../../infrastructure/database/models/branch-warehouse.model';
import { z } from 'zod';

export class BranchController {
  constructor(
    private readonly createBranchUseCase: CreateBranchUseCase,
    private readonly getBranchesUseCase: GetBranchesUseCase,
    private readonly updateBranchUseCase: UpdateBranchUseCase,
    private readonly deleteBranchUseCase: DeleteBranchUseCase
  ) {}

  async create(req: AuthenticatedRequest, res: Response) {
    const branchSchema = z.object({
      companyId: z.number().int("La empresa asociada es obligatoria."),
      name: z.string().min(3, "El nombre de la sucursal debe tener al menos 3 caracteres."),
      address: z.string().nullable().optional(),
      isPointOfSale: z.boolean().default(true),
      isWarehouse: z.boolean().default(true),
      defaultWarehouseId: z.number().int().nullable().optional()
    });

    const body = branchSchema.parse(req.body);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) {
      return res.status(401).json({ status: "fail", message: "No autorizado: Suscripción SaaS nula." });
    }

    const newBranch = await this.createBranchUseCase.execute({
      subscriptionId,
      ...body
    });

    return res.status(201).json({
      status: "success",
      message: "Establecimiento comercial registrado correctamente.",
      data: newBranch
    });
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const branchId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId || isNaN(branchId)) {
      return res.status(400).json({ status: "fail", message: "Identificadores inválidos." });
    }

    const exists = await BranchWarehouseModel.findOne({ where: { id: branchId, subscriptionId } });
    if (!exists) {
      return res.status(404).json({ status: "fail", message: `No se encontró el establecimiento con ID #${branchId}.` });
    }

    const updateSchema = z.object({
      companyId: z.number().int().optional(),
      name: z.string().min(3).optional(),
      address: z.string().nullable().optional(),
      isPointOfSale: z.boolean().optional(),
      isWarehouse: z.boolean().optional(),
      defaultWarehouseId: z.number().int().nullable().optional()
    });

    const body = updateSchema.parse(req.body);

    const updated = await this.updateBranchUseCase.execute(branchId, subscriptionId, body);

    return res.status(200).json({
      status: "success",
      message: "Establecimiento actualizado con éxito.",
      data: updated
    });
  }

  async getPaginated(req: AuthenticatedRequest, res: Response) {
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) {
      return res.status(401).json({ status: "fail", message: "Suscripción no válida." });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const filters = {
      name: req.query.name as string,
      companyId: req.query.companyId ? parseInt(req.query.companyId as string) : undefined
    };

    const sortInput = {
      field: req.query.sortField as string || 'id',
      order: (req.query.sortOrder as string || 'ASC').toUpperCase()
    };

    const result = await this.getBranchesUseCase.execute({
      subscriptionId,
      page,
      limit,
      filters,
      sortInput
    });

    return res.status(200).json({
      status: "success",
      data: result
    });
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    const branchId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId || isNaN(branchId)) {
      return res.status(400).json({ status: "fail", message: "Parámetros inválidos." });
    }

    const exists = await BranchWarehouseModel.findOne({ where: { id: branchId, subscriptionId } });
    if (!exists) {
      return res.status(404).json({ status: "fail", message: "El establecimiento comercial solicitado no existe." });
    }

    await this.deleteBranchUseCase.execute(branchId, subscriptionId);

    return res.status(200).json({
      status: "success",
      message: "Establecimiento dado de baja lógicamente con éxito."
    });
  }
}