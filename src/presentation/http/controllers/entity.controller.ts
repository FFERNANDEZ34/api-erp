import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { CreateEntityUseCase } from "../../../application/use-cases/entities/create-entity";
import { GetEntitiesPaginatedUseCase } from "../../../application/use-cases/entities/get-entities-paginated";
import { UpdateEntityUseCase } from "../../../application/use-cases/entities/update-entity";
import { DeleteEntityUseCase } from "../../../application/use-cases/entities/delete-entity";
import { ConsultPadronUseCase } from "../../../application/use-cases/entities/consult-padron";

import { z } from "zod";

export class EntityController {
  constructor(
    private createEntityUseCase: CreateEntityUseCase,
    private getEntitiesPaginatedUseCase: GetEntitiesPaginatedUseCase,
    private readonly updateEntityUseCase: UpdateEntityUseCase,
    private readonly deleteEntityUseCase: DeleteEntityUseCase,
    private readonly consultPadronUseCase: ConsultPadronUseCase,
  ) {}

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      // 1. Validar la estructura de la petición HTTP con Zod
      const entitySchema = z.object({
        entityType: z.enum(["persona", "empresa"], {
          errorMap: () => ({
            message: "El tipo de entidad debe ser 'persona' o 'empresa'",
          }),
        }),
        documentType: z.string().min(1).max(2),
        documentNumber: z
          .string()
          .min(5, "El número de documento debe tener al menos 5 caracteres"),
        name: z
          .string()
          .min(3, "El nombre o razón social debe tener al menos 3 caracteres"),
        email: z
          .string()
          .email("Formato de correo electrónico inválido")
          .nullable()
          .optional(),
      });

      const body = entitySchema.parse(req.body);
      const subscriptionId = req.user?.subscriptionId;

      if (!subscriptionId) {
        return res.status(401).json({
          status: "fail",
          message: "No autorizado: Suscripción no válida.",
        });
      }

      // 2. Despachar la ejecución hacia el caso de uso de negocio
      const newEntity = await this.createEntityUseCase.execute({
        subscriptionId,
        entityType: body.entityType,
        documentType: body.documentType,
        documentNumber: body.documentNumber,
        name: body.name,
        email: body.email || null,
      });

      return res.status(201).json({
        status: "success",
        message:
          "Entidad registrada con éxito en el catálogo maestro compartido.",
        data: newEntity,
      });
    } catch (error: any) {
      console.warn(
        `⚠️ [RADAR CONTROLADOR] Interceptando excepción controlada: ${error.message}`,
      );

      // 🚀 SOLUCIÓN: Cambiamos el texto genérico para que devuelva el mensaje exacto lanzado por tu Caso de Uso
      return res.status(400).json({
        status: "fail",
        message: error.message, // 🎯 Aquí inyectamos: "La entidad con número de documento 41938472 ya se encuentra registrada..."
      });
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const entityId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) {
      return res.status(401).json({
        status: "fail",
        message: "No autorizado: Suscripción no válida.",
      });
    }

    const updateSchema = z.object({
      name: z
        .string()
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .optional(),
      email: z
        .string()
        .email("Formato de correo electrónico inválido")
        .nullable()
        .optional(),
    });

    const body = updateSchema.parse(req.body);

    const updatedEntity = await this.updateEntityUseCase.execute(
      entityId,
      subscriptionId,
      body,
    );

    return res.status(200).json({
      status: "success",
      message: "Entidad actualizada correctamente.",
      data: updatedEntity,
    });
  }

  // ❌ MÉTODO: Eliminar una Entidad del Catálogo Maestro
  async delete(req: AuthenticatedRequest, res: Response) {
    const entityId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId) {
      return res.status(401).json({
        status: "fail",
        message: "No autorizado: Suscripción no válida.",
      });
    }

    await this.deleteEntityUseCase.execute(entityId, subscriptionId);

    return res.status(200).json({
      status: "success",
      message: "Entidad eliminada con éxito de su catálogo compartido.",
    });
  }

  async getPaginated(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const { documentType, documentNumber, name, email } = req.query;

    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId)
      throw new Error("Identificador de suscripción no válido");

    // Filtros de búsqueda maestro
    const filters = {
      name: req.query.name as string,
      documentNumber: req.query.documentNumber as string,
      documentType: documentType as string, // Encaja directo con el nuevo campo
      email: email as string,
    };

    // Parámetros de ordenamiento dinámico
    const sortInput = {
      field: req.query.sortField as string, // 'id', 'name', 'entityType', 'createdAt'
      order: req.query.sortOrder as string, // 'asc', 'desc'
    };

    const result = await this.getEntitiesPaginatedUseCase.execute({
      subscriptionId,
      page,
      limit,
      filters,
      sortInput,
    });

    return res.status(200).json(result);
  }

  async consultExternalPadron(req: Request, res: Response) {
    try {
      const { type, number } = req.params;

      // 🎯 EL AJUSTE DE ARQUITECTURA LIMPIA:
      // Consumimos directamente la instancia inyectada por el constructor en lugar de hacer un "new" manual.
      const result = await this.consultPadronUseCase.execute(type, number);

      return res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (error: any) {
      console.error("🚨 [ERROR CONTROLADO PADRÓN]:", error.message);

      return res.status(400).json({
        status: "fail",
        message: error.message || "Error al consultar el padrón nacional.",
      });
    }
  }
}
