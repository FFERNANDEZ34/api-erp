import { ProductModel } from "../../../infrastructure/database/models/product.model";
import { AuxiliaryParameterModel } from "../../../infrastructure/database/models/auxiliary-parameter.model";
import { ProductCategoryModel } from "../../../infrastructure/database/models/product-category.model"; // 🚀 1. IMPORTAMOS NUEVA TABLA
import { ProductBrandModel } from "../../../infrastructure/database/models/product-brand.model";       // 🚀 2. IMPORTAMOS NUEVA TABLA
import { Op, OrderItem } from "sequelize";

export interface ProductFilters {
  name?: string;
  productCode?: string;
  categoryId?: number;
}

export class GetProductsPaginatedUseCase {
  async execute(params: {
    subscriptionId: number;
    companyId: number; 
    page: number;
    limit: number;
    filters: ProductFilters;
    sortInput: { field?: string; order?: string };
  }) {
    const sanitizedPage = params.page < 1 ? 1 : params.page;
    const sanitizedLimit = params.limit < 1 || params.limit > 100 ? 10 : params.limit;
    const offset = (sanitizedPage - 1) * sanitizedLimit;

    // 🛡️ AISLAMIENTO SAAS CORPORATIVO DOBLE CAPA (Suscripción + Compañía Activa)
    const whereClause: any = {
      subscriptionId: params.subscriptionId,
      companyId: params.companyId, 
      isActive: true,
    };

    if (params.filters.name?.trim()) {
      whereClause.name = { [Op.like]: `%${params.filters.name.trim()}%` };
    }
    if (params.filters.productCode?.trim()) {
      whereClause.productCode = { [Op.like]: `%${params.filters.productCode.trim()}%` };
    }
    if (params.filters.categoryId) {
      whereClause.categoryId = params.filters.categoryId;
    }

    const allowedFields = ["id", "name", "productCode", "salesPrice", "createdAt"];
    const field = allowedFields.includes(params.sortInput.field || "") ? params.sortInput.field : "id";
    const order = params.sortInput.order?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    // =========================================================================
    // 🎯 RE-ACOPLAMIENTO DE ASOCIACIONES SEQUELIZE A LAS NUEVAS TABLAS MODULARES
    // =========================================================================
    
    // 📁 RELACIÓN 1: Nueva Tabla de Categorías Aislada por Empresa
    if (!ProductModel.associations.Category) {
      ProductModel.belongsTo(ProductCategoryModel, {
        foreignKey: "categoryId",
        targetKey: "id",
        as: "Category",
        constraints: false,
      });
    }

    // 🏷️ RELACIÓN 2: Nueva Tabla de Marcas Aislada por Empresa
    if (!ProductModel.associations.Brand) {
      ProductModel.belongsTo(ProductBrandModel, {
        foreignKey: "brandId",
        targetKey: "id",
        as: "Brand",
        constraints: false,
      });
    }

    // 💵 RELACIÓN 3: Tabla Paramétrica Transversal para Monedas (Sigue intacto)
    if (!ProductModel.associations.Currency) {
      ProductModel.belongsTo(AuxiliaryParameterModel, {
        foreignKey: "currencyParamId",
        targetKey: "id",
        as: "Currency",
        constraints: false,
      });
    }
    // =========================================================================

    const { rows, count } = await ProductModel.findAndCountAll({
      where: whereClause,
      limit: sanitizedLimit,
      offset: offset,
      order: [[field, order]] as OrderItem[],
      include: [
        {
          model: ProductCategoryModel, // 🚀 Cambiado al nuevo modelo físico
          as: "Category",
          attributes: ["id", "name"],  // Jalamos solo id y name (ya no existe code en el DDL nuevo)
        },
        {
          model: ProductBrandModel,    // 🚀 Cambiado al nuevo modelo físico
          as: "Brand",
          attributes: ["id", "name"],  // Jalamos solo id y name
        },
        {
          model: AuxiliaryParameterModel,
          as: "Currency",
          attributes: ["id", "code", "name"],
        }
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