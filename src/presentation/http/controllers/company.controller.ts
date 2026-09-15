import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { CreateCompanyUseCase } from "../../../application/use-cases/companies/create-company";
import { UpdateCompanyUseCase } from "../../../application/use-cases/companies/update-company";
import { GetCompaniesUseCase } from "../../../application/use-cases/companies/get-companies";
import { DeleteCompanyUseCase } from "../../../application/use-cases/companies/delete-company";
import { CompanyModel } from '../../../infrastructure/database/models/company.model'; 

import { z } from "zod";

export class CompanyController {
  constructor(
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly getCompaniesUseCase: GetCompaniesUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    private readonly deleteCompanyUseCase: DeleteCompanyUseCase,
  ) {}

  async create(req: AuthenticatedRequest, res: Response) {
    const companySchema = z.object({
      ruc: z
        .string()
        .regex(
          /^\d{11}$/,
          "El RUC debe contener estrictamente 11 dígitos numéricos puros.",
        ),
      name: z
        .string()
        .min(3, "La razón social debe tener al menos 3 caracteres."),
      address: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z
        .string()
        .email("Formato de correo electrónico institucional inválido.")
        .nullable()
        .optional(),
    });

    const body = companySchema.parse(req.body);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) {
      return res
        .status(401)
        .json({
          status: "fail",
          message: "No autorizado: Suscripción SaaS nula.",
        });
    }

    const newCompany = await this.createCompanyUseCase.execute({
      subscriptionId,
      ...body,
    });

    return res.status(201).json({
      status: "success",
      message: "Empresa registrada con éxito en el holding corporativo.",
      data: newCompany,
    });
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const companyId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId || isNaN(companyId)) {
      return res
        .status(400)
        .json({
          status: "fail",
          message: "Identificadores de transacción no válidos.",
        });
    }

    // 🕵️‍♂️ CONTROL DE EXISTENCIA PREVIA: Validamos si el ID realmente existe en la BD antes de avanzar
    const companyExists = await CompanyModel.findOne({
      where: { id: companyId, subscriptionId },
    });

    if (!companyExists) {
      return res.status(404).json({
        status: "fail",
        message: `Operación cancelada: No se encontró ninguna empresa registrada con el ID #${companyId} en su holding.`,
      });
    }

    const updateSchema = z.object({
      ruc: z
        .string()
        .regex(/^\d{11}$/)
        .optional(),
      name: z.string().min(3).optional(),
      address: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().email().nullable().optional(),
    });

    const body = updateSchema.parse(req.body);

    // Si pasó el control, despachamos con total seguridad al caso de uso
    const updated = await this.updateCompanyUseCase.execute(
      companyId,
      subscriptionId,
      body,
    );

    return res.status(200).json({
      status: "success",
      message: "Ficha corporativa actualizada correctamente.",
      data: updated,
    });
  }

  async getPaginated(req: AuthenticatedRequest, res: Response) {
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) {
      return res
        .status(401)
        .json({ status: "fail", message: "Contexto SaaS no válido." });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const filters = {
      name: req.query.name as string,
      ruc: req.query.ruc as string,
    };

    const sortInput = {
      field: (req.query.sortField as string) || "id",
      order: ((req.query.sortOrder as string) || "ASC").toUpperCase(),
    };

    const result = await this.getCompaniesUseCase.execute({
      subscriptionId,
      page,
      limit,
      filters,
      sortInput,
    });

    return res.status(200).json({
      status: "success",
      data: result,
    });
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    const companyId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId || isNaN(companyId)) {
      return res
        .status(400)
        .json({ status: "fail", message: "Parámetros de baja inválidos." });
    }

    // 🕵️‍♂️ CONTROL DE EXISTENCIA PREVIA: Validamos si el ID existe antes de aplicar la baja lógica
    const companyExists = await CompanyModel.findOne({
      where: { id: companyId, subscriptionId },
    });

    if (!companyExists) {
      return res.status(404).json({
        status: "fail",
        message: `Operación cancelada: La empresa con ID #${companyId} que intenta dar de baja no existe en el sistema.`,
      });
    }

    // Si el ID es real, procedemos a inactivar
    await this.deleteCompanyUseCase.execute(companyId, subscriptionId);

    return res.status(200).json({
      status: "success",
      message:
        "La empresa ha sido dada de baja lógicamente de su holding con éxito.",
    });
  }
}
