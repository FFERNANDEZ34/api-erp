import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { CreateProductUseCase } from "../../../application/use-cases/products/create-product";
import { UpdateProductUseCase } from "../../../application/use-cases/products/update-product";
import { GetProductsPaginatedUseCase } from "../../../application/use-cases/products/get-products-paginated";
import { DeleteProductUseCase } from "../../../application/use-cases/products/delete-product";
import { z } from "zod";

export class ProductController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductsPaginatedUseCase: GetProductsPaginatedUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  // 📥 OPERACIÓN A: Registrar Artículo o Servicio con Aislamiento de Empresa
  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const productSchema = z.object({
        productCode: z.string().min(2, "El código de producto es obligatorio."),
        name: z
          .string()
          .min(3, "El nombre debe contener al menos 3 caracteres."),
        description: z.string().nullable().optional(),
        sku: z.string().nullable().optional(),
        barCode: z.string().nullable().optional(),
        categoryId: z.number().int("Categoría inválida."),
        brandId: z.number().int("Marca inválida."),
        currencyParamId: z.number().int("Moneda inválida."),
        taxTypeParamId: z
          .number()
          .int("Tipo de afectación tributaria inválida."),
        unitMeasureParamId: z.number().int("Unidad de medida inválida."),
        purchasePrice: z
          .number()
          .positive("El precio de compra debe ser mayor a cero."),
        salesPrice: z
          .number()
          .positive("El precio de venta debe ser mayor a cero."),
        minimumStock: z
          .number()
          .min(0, "El stock mínimo no puede ser negativo.")
          .default(0),
        isPackage: z.boolean().default(false),
        allowSearch: z.boolean().default(true),
      });

      const body = productSchema.parse(req.body);
      const subscriptionId = req.user?.subscriptionId;

      // Capturamos el contexto de empresa obligatoria enviado por el selector superior
      const companyId = parseInt(req.headers["x-company-id"] as string);

      if (!subscriptionId || isNaN(companyId)) {
        return res.status(401).json({
          status: "fail",
          message:
            "Seguridad Multi-Tenant: Contexto de Holding o Empresa comercial no válido.",
        });
      }

      const newProduct = await this.createProductUseCase.execute({
        subscriptionId,
        companyId, // 🏢 Persistencia indexada por empresa
        ...body,
      });

      return res.status(201).json({
        status: "success",
        message:
          "Artículo indexado correctamente en el inventario comercial de la empresa.",
        data: newProduct,
      });
    } catch (error: any) {
      // 🛡️ EL ESCUDO SALVAVIDAS: Atrapa el 'throw new Error' de tu caso de uso preventivo
      // Evita que Node.js se muera, imprime la advertencia de negocio y manda un JSON limpio
      console.warn(
        `⚠️ [ADVERTENCIA DE NEGOCIO INTERCEPTADA]: ${error.message}`,
      );

      return res.status(400).json({
        status: "fail",
        message: error.message, // "El código de producto [prod0006] ya se encuentra registrado..."
      });
    }
  }

  // 📝 OPERACIÓN B: Actualizar Ficha de Producto y Recalcular Impuestos
  async update(req: AuthenticatedRequest, res: Response) {
    const productId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId || isNaN(productId)) {
      return res
        .status(401)
        .json({
          status: "fail",
          message: "Identificadores de transacción inválidos.",
        });
    }

    const updateProductSchema = z.object({
      name: z.string().min(3).optional(),
      description: z.string().nullable().optional(),
      sku: z.string().nullable().optional(),
      barCode: z.string().nullable().optional(),
      categoryId: z.number().int().optional(),
      brandId: z.number().int().optional(),
      currencyParamId: z.number().int().optional(),
      taxTypeParamId: z.number().int().optional(),
      unitMeasureParamId: z.number().int().optional(),
      purchasePrice: z.number().positive().optional(),
      salesPrice: z.number().positive().optional(),
      minimumStock: z.number().min(0).optional(),
      isPackage: z.boolean().optional(),
      allowSearch: z.boolean().optional(),
    });

    const body = updateProductSchema.parse(req.body);

    const updatedProduct = await this.updateProductUseCase.execute(
      productId,
      subscriptionId,
      body,
    );

    return res.status(200).json({
      status: "success",
      message: "Ficha de inventario actualizada con éxito.",
      data: updatedProduct,
    });
  }

  // 📑 OPERACIÓN C: Listado Paginado Aislado por Empresa y Holding (isActive: true)
  async getPaginated(req: AuthenticatedRequest, res: Response) {
    const subscriptionId = req.user?.subscriptionId;
    const companyId = parseInt(req.headers["x-company-id"] as string);

    if (!subscriptionId || isNaN(companyId)) {
      return res.status(401).json({
        status: "fail",
        message:
          "No se proporcionó un contexto comercial válido para segmentar las existencias.",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const filters = {
      name: req.query.name as string,
      productCode: req.query.productCode as string,
      categoryId: req.query.categoryId
        ? parseInt(req.query.categoryId as string)
        : undefined,
    };

    const sortInput = {
      field: (req.query.sortField as string) || "id",
      order: ((req.query.sortOrder as string) || "DESC").toUpperCase(),
    };

    const result = await this.getProductsPaginatedUseCase.execute({
      subscriptionId,
      companyId, // 🔒 Candado de aislamiento empresarial
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

  // 💥 OPERACIÓN D: Baja Lógica (Inactivación de Flags)
  async delete(req: AuthenticatedRequest, res: Response) {
    const productId = parseInt(req.params.id);
    const subscriptionId = req.user?.subscriptionId;

    if (!subscriptionId || isNaN(productId)) {
      return res
        .status(401)
        .json({ status: "fail", message: "Parámetros de baja inválidos." });
    }

    await this.deleteProductUseCase.execute(productId, subscriptionId);

    return res.status(200).json({
      status: "success",
      message:
        "El artículo ha sido dado de baja lógicamente del catálogo comercial.",
    });
  }
}
