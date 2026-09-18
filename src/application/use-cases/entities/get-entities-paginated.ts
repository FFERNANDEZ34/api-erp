import { EntityModel } from "../../../infrastructure/database/models/entity.model";
import { AuxiliaryParameterModel } from "../../../infrastructure/database/models/auxiliary-parameter.model"; // 🚀 ¡AÑADIDO!: Importamos el modelo paramétrico
import { Op } from "sequelize";
import { OrderItem } from "sequelize";

// 🌟 AMPLIAMOS LA INTERFAZ: Registramos de forma estricta los nuevos campos de filtrado
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
    const sanitizedLimit =
      params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // 1. Construir Cláusula WHERE (Filtros + Aislamiento por Suscripción)
    const whereClause: any = {
      subscriptionId: params.subscriptionId, // 🔒 Seguridad SaaS obligatoria
    };

    if (params.filters.name && params.filters.name.trim().length > 0) {
      whereClause.name = { [Op.like]: `%${params.filters.name.trim()}%` };
    }

    if (
      params.filters.documentNumber &&
      params.filters.documentNumber.trim().length > 0
    ) {
      whereClause.documentNumber = {
        [Op.like]: `%${params.filters.documentNumber.trim()}%`,
      };
    }

    if (
      params.filters.documentType &&
      params.filters.documentType.trim().length > 0
    ) {
      // 🌟 CORRECCIÓN: Filtramos el código directo sin toLowerCase() ya que guarda '1', '6', etc.
      whereClause.documentType = params.filters.documentType.trim();
    }

    if (params.filters.email && params.filters.email.trim().length > 0) {
      whereClause.email = { [Op.like]: `%${params.filters.email.trim()}%` };
    }

    // 2. Validar y Sanitizar Ordenamiento (White-listing)
    const allowedFields = ["id", "name", "entityType", "createdAt"];
    const allowedOrders = ["ASC", "DESC"];

    const field = allowedFields.includes(params.sortInput.field || "")
      ? params.sortInput.field
      : "id";

    // Unificamos el ordenamiento convirtiendo la cadena a mayúsculas
    const orderInputUpper = params.sortInput.order?.toUpperCase() || "";
    const order = allowedOrders.includes(orderInputUpper)
      ? orderInputUpper
      : "ASC";

    // =========================================================================
    // 🚀 3. ENGRANAJE RELACIONAL EN CALIENTE (ASOCIACIÓN DE SEQUELIZE)
    // =========================================================================
    if (!EntityModel.associations.DocumentParameter) {
      EntityModel.belongsTo(AuxiliaryParameterModel, {
        foreignKey: "documentType", // La columna en la tabla entities
        targetKey: "code", // La columna en la tabla sys_auxiliary_parameters
        as: "DocumentParameter", // Alias de navegación para la consulta
        constraints: false,
        scope: {
          parameterType: "TIPO_DOCUMENTO_IDENTIDAD",
          subscriptionId: params.subscriptionId, // Garantiza aislamiento multi-tenant del parámetro
        },
      });
    }
    // 4. Ejecutar consulta en la Base de Datos incorporando el LEFT JOIN
    const { rows, count } = await EntityModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [[field, order]] as OrderItem[],
      // 🚀 INYECCIÓN LOGÍSTICA: Sequelize resolverá el JOIN de forma nativa en MySQL
      include: [
        {
          model: AuxiliaryParameterModel,
          as: "DocumentParameter",
          required: false, // Actúa exactamente como un LEFT JOIN
          attributes: ["name"], // Traemos únicamente el campo 'name' descriptivo (DNI, RUC)
        },
      ],
    });

    return {
      // Al mapear las filas con toJSON() se incorporará el subobjeto DocumentParameter de forma estructurada
      data: rows.map((r) => r.toJSON()),
      total: count,
      page: sanitizedPage,
      limit: sanitizedLimit,
    };
  }
}
