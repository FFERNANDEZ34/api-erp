import { EntityModel } from "../../../infrastructure/database/models/entity.model";
import { Op } from "sequelize";
import { OrderItem } from "sequelize";

export interface EntityFilters {
  name?: string;
  documentNumber?: string;
}

export interface EntitySort {
  field: "id" | "name" | "entityType" | "createdAt";
  order: "ASC" | "DESC";
}

export class GetEntitiesPaginatedUseCase {
  async execute(params: {
    subscriptionId: number;
    page: number;
    limit: number;
    filters: EntityFilters;
    sortInput: { field?: string; order?: string };
  }) {
    const sanitizedPage = params.page < 1 ? 1 : params.page;
    const sanitizedLimit =
      params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // 1. Construir Cláusula WHERE (Filtros + Aislamiento por Suscripción)
    const whereClause: any = {
      subscriptionId: params.subscriptionId, // 🔒 Seguridad SaaS obligatoria
    };

    if (params.filters.name?.trim()) {
      whereClause.name = { [Op.like]: `%${params.filters.name.trim()}%` };
    }
    if (params.filters.documentNumber?.trim()) {
      whereClause.documentNumber = {
        [Op.like]: `%${params.filters.documentNumber.trim()}%`,
      };
    }

    // 2. Validar y Sanitizar Ordenamiento (White-listing)
    const allowedFields = ["id", "name", "entityType", "createdAt"];
    const allowedOrders = ["ASC", "DESC"];

    const field = allowedFields.includes(params.sortInput.field || "")
      ? params.sortInput.field
      : "id";

    const order = allowedOrders.includes(
      params.sortInput.order?.toUpperCase() || "",
    )
      ? params.sortInput.order?.toUpperCase()
      : "ASC";

    // 3. Ejecutar consulta en la Base de Datos a través del Modelo
    const { rows, count } = await EntityModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [[field, order]] as OrderItem[],
      //raw: true,
    });

    return {
      data: rows.map((r) => r.toJSON()),
      total: count,
      page: sanitizedPage,
      limit: sanitizedLimit,
    };
  }
}
