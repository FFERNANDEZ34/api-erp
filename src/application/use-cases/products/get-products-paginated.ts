import { ProductModel } from "../../../infrastructure/database/models/product.model";
import { AuxiliaryParameterModel } from "../../../infrastructure/database/models/auxiliary-parameter.model";
import { Op, OrderItem } from "sequelize";

export interface ProductFilters {
  name?: string;
  productCode?: string;
  categoryId?: number;
}

export class GetProductsPaginatedUseCase {
  async execute(params: {
    subscriptionId: number;
    companyId: number; // 👈 AJUSTE COMPAÑÍA: Recibe el ID de la cabecera de Angular
    page: number;
    limit: number;
    filters: ProductFilters;
    sortInput: { field?: string; order?: string };
  }) {
    const sanitizedPage = params.page < 1 ? 1 : params.page;
    const sanitizedLimit =
      params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // 🛡️ AISLAMIENTO SAAS CORPORATIVO DOBLE CAPA (Suscripción + Compañía Activa)
    const whereClause: any = {
      subscriptionId: params.subscriptionId,
      companyId: params.companyId, // 🔒 CORTAFUEGOS EN CALIENTE: Aísla el inventario de este holding
      isActive: true,
    };

    if (params.filters.name?.trim()) {
      whereClause.name = { [Op.like]: `%${params.filters.name.trim()}%` };
    }
    if (params.filters.productCode?.trim()) {
      whereClause.productCode = {
        [Op.like]: `%${params.filters.productCode.trim()}%`,
      };
    }
    if (params.filters.categoryId) {
      whereClause.categoryId = params.filters.categoryId;
    }

    const allowedFields = [
      "id",
      "name",
      "productCode",
      "salesPrice",
      "createdAt",
    ];
    const field = allowedFields.includes(params.sortInput.field || "")
      ? params.sortInput.field
      : "id";
    const order =
      params.sortInput.order?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    // if (!ProductModel.associations.UnitMeasureParameter) {
    //   ProductModel.belongsTo(AuxiliaryParameterModel, {
    //     foreignKey: "unitMeasureParamId", // Revisa si tu columna foránea física se llama así
    //     targetKey: "id", // Se amarra al ID de la tabla paramétrica
    //     as: "UnitMeasureParameter", // El alias que use tu include en la consulta
    //     constraints: false,
    //   });
    // }

    // if (!ProductModel.associations.TaxTypeParameter) {
    //   ProductModel.belongsTo(AuxiliaryParameterModel, {
    //     foreignKey: "taxTypeParamId", // Tu columna foránea para la afectación al IGV
    //     targetKey: "id",
    //     as: "TaxTypeParameter", // El alias que use tu include en la consulta
    //     constraints: false,
    //   });
    // }

    if (!ProductModel.associations.Category) {
      ProductModel.belongsTo(AuxiliaryParameterModel, {
        foreignKey: "categoryId",
        targetKey: "id",
        as: "Category",
        constraints: false,
      });
    }

    // // 🏷️ RELACIÓN 2: Marca del Producto
    if (!ProductModel.associations.Brand) {
      ProductModel.belongsTo(AuxiliaryParameterModel, {
        foreignKey: "brandId",
        targetKey: "id",
        as: "Brand",
        constraints: false,
      });
    }

    // 💵 RELACIÓN 3: Moneda del Producto
    if (!ProductModel.associations.Currency) {
      ProductModel.belongsTo(AuxiliaryParameterModel, {
        foreignKey: "currencyParamId",
        targetKey: "id",
        as: "Currency",
        constraints: false,
      });
    }

    const { rows, count } = await ProductModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [[field, order]] as OrderItem[],
      include: [
        {
          model: AuxiliaryParameterModel,
          as: "Category",
          attributes: ["id", "code", "name"],
        },
        {
          model: AuxiliaryParameterModel,
          as: "Brand",
          attributes: ["id", "code", "name"],
        },
        {
          model: AuxiliaryParameterModel,
          as: "Currency",
          attributes: ["id", "code", "name"],
        },
        // {
        //   model: AuxiliaryParameterModel,
        //   as: "UnitMeasureParameter",
        //   required: false,
        //   attributes: ["name", "code"],
        // },
        // {
        //   model: AuxiliaryParameterModel,
        //   as: "TaxTypeParameter",
        //   required: false,
        //   attributes: ["name", "code"],
        // },
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
