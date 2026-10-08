import { EntityModel } from "../../../infrastructure/database/models/entity.model";
import { AuxiliaryParameterModel } from "../../../infrastructure/database/models/auxiliary-parameter.model";
import { Op } from "sequelize";
import { OrderItem } from "sequelize";

export interface EntityFilters {
  name?: string;
  documentNumber?: string;
  documentType?: string; // 📁 '1', '6', etc. alineado a la SUNAT
  email?: string; // 📧 Canal de contacto
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
    const sanitizedLimit = params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // 1. Construir Cláusula WHERE (Filtros + Aislamiento por Suscripción)
    const whereClause: any = {
      subscriptionId: params.subscriptionId, // 🔒 Seguridad SaaS obligatoria
    };

    if (params.filters.name && params.filters.name.trim().length > 0) {
      whereClause.name = { [Op.like]: `%${params.filters.name.trim()}%` };
    }

    if (params.filters.documentNumber && params.filters.documentNumber.trim().length > 0) {
      whereClause.documentNumber = { [Op.like]: `%${params.filters.documentNumber.trim()}%` };
    }

    if (params.filters.documentType && params.filters.documentType.trim().length > 0) {
      whereClause.documentType = params.filters.documentType.trim();
    }

    if (params.filters.email && params.filters.email.trim().length > 0) {
      whereClause.email = { [Op.like]: `%${params.filters.email.trim()}%` };
    }

    // 2. Validar y Sanitizar Ordenamiento (White-listing)
    const allowedFields = ["id", "name", "entityType", "createdAt"];
    const allowedOrders = ["ASC", "DESC"];

    const field = allowedFields.includes(params.sortInput.field || "") ? params.sortInput.field : "id";
    const orderInputUpper = params.sortInput.order?.toUpperCase() || "";
    const order = allowedOrders.includes(orderInputUpper) ? orderInputUpper : "ASC";

    // =========================================================================
    // 🚀 3. ENGRANAJE RELACIONAL CROSS-TENANT EN CALIENTE (ASOCIACIÓN DEFINITIVA)
    // =========================================================================
    if (!EntityModel.associations.DocumentParameter) {
      EntityModel.belongsTo(AuxiliaryParameterModel, {
        foreignKey: "documentType", // La columna en la tabla entities (Ej: '1' o '6')
        targetKey: "code",          // Se amarra a la columna 'code' de la tabla de parámetros
        as: "DocumentParameter",
        constraints: false,
        scope: {
          parameterType: "TIPO_DOCUMENTO_IDENTIDAD",
          // 🔌 EL DESTRABE CONTABLE: Permitimos jalar los parámetros globales de la SUNAT (NULL)
          // o los parametrizados específicamente en el holding
          [Op.or]: [
            { subscriptionId: null },
            { subscriptionId: params.subscriptionId }
          ]
        },
      });
    }
    // =========================================================================

    // 4. Ejecutar consulta en la Base de Datos incorporando el LEFT JOIN
    const { rows, count } = await EntityModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [[field, order]] as OrderItem[],
      include: [
        {
          model: AuxiliaryParameterModel,
          as: "DocumentParameter",
          required: false, // Actúa exactamente como un LEFT JOIN
          attributes: ["name", "code"], // Traemos el name (RUC, DNI) y el code para validaciones de front
        },
      ],
    });

    return {
      data: rows.map((r) => r.toJSON()),
      total: count,
      page: sanitizedPage,
      limit: sanitizedLimit,
    };
  }
}