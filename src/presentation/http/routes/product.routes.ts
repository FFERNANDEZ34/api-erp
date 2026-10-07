import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { CreateProductUseCase } from "../../../application/use-cases/products/create-product";
import { GetProductsPaginatedUseCase } from "../../../application/use-cases/products/get-products-paginated";
import { UpdateProductUseCase } from "../../../application/use-cases/products/update-product";
import { DeleteProductUseCase } from "../../../application/use-cases/products/delete-product";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { AuxiliaryParameterModel } from "../../../infrastructure/database/models/auxiliary-parameter.model"; // Ajusta la ruta
import { ProductBrandModel } from "../../../infrastructure/database/models/product-brand.model";
import { ProductCategoryModel } from "../../../infrastructure/database/models/product-category.model";
import { Op } from 'sequelize';

const productRouter = Router();



// Instanciamos la cadena de capas de la Arquitectura Limpia
const createProductUseCase = new CreateProductUseCase();
const getProductsPaginatedUseCase = new GetProductsPaginatedUseCase();
const updateProductUseCase = new UpdateProductUseCase();
const deleteProductUseCase = new DeleteProductUseCase();

const productController = new ProductController(
  createProductUseCase,
  getProductsPaginatedUseCase,
  updateProductUseCase,
  deleteProductUseCase
);


productRouter.get("/parameters", authMiddleware, async (req: any, res: any) => {
  try {
    const subscriptionId = req.user?.subscriptionId || 1;
    const { type } = req.query; // 'CATEGORIA', 'MARCA', 'MONEDA', 'AFECTACION', 'UNIDAD_MEDIDA'

    // =========================================================================
    // 🎯 EL DESTRABE DE PARÁMETROS UNIVERSALES CROSS-TENANT (MYSQL EN AIVEN)
    // Construimos la condición amparando lo que es GLOBAL o propio del HOLDING
    // =========================================================================
    const whereConditions: any = { 
      isActive: true,
      [Op.or]: [
        { subscriptionId: null },            // 🔌 Luz verde a lo transversal (Monedas, Afectaciones, Unidades)
        { subscriptionId: subscriptionId }   // 🔒 Privado y exclusivo (Tus Categorías y Marcas personalizadas)
      ]
    };

    // Si Angular nos envía un tipo específico, lo inyectamos al búnker de condiciones
    if (type) {
      whereConditions.parameterType = (type as string).toUpperCase();
    }
    // =========================================================================

    const parameters = await AuxiliaryParameterModel.findAll({
      where: whereConditions,
      order: [['name', 'ASC']],
      raw: true
    });

    return res.status(200).json({ status: "success", data: parameters });
  } catch (error: any) {
    console.error('🚨 [CRASH CATALOG PARAMETERS]:', error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

productRouter.get("/categories", authMiddleware, async (req: any, res: any) => {
  try {
    const subscriptionId = req.user?.subscriptionId;
    const companyId = req.user?.activeContext?.companyId || 1; // ID de empresa del token de login

    if (!subscriptionId) return res.status(401).json({ status: "fail", message: "No autorizado." });

    const categories = await ProductCategoryModel.findAll({
      where: { subscriptionId, companyId, isActive: true },
      order: [['name', 'ASC']],
      raw: true
    });

    return res.status(200).json({ status: "success", data: categories });
  } catch (error: any) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * 📡 GOLPE B: Listar Marcas de la Empresa Activa
 * URL en Angular: /api/products/brands
 */
productRouter.get("/brands", authMiddleware, async (req: any, res: any) => {
  try {
    const subscriptionId = req.user?.subscriptionId;
    const companyId = req.user?.activeContext?.companyId || 1;

    if (!subscriptionId) return res.status(401).json({ status: "fail", message: "No autorizado." });

    const brands = await ProductBrandModel.findAll({
      where: { subscriptionId, companyId, isActive: true },
      order: [['name', 'ASC']],
      raw: true
    });

    return res.status(200).json({ status: "success", data: brands });
  } catch (error: any) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// Mapeado físico de Endpoints protegidos por sesión transaccional
productRouter.post("/", authMiddleware, (req: any, res: any) => productController.create(req, res));
productRouter.get("/", authMiddleware, (req: any, res: any) => productController.getPaginated(req, res));
productRouter.put("/:id", authMiddleware, (req: any, res: any) => productController.update(req, res));
productRouter.delete("/:id", authMiddleware, (req: any, res: any) => productController.delete(req, res));

export { productRouter };