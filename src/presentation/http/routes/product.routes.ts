import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { CreateProductUseCase } from "../../../application/use-cases/products/create-product";
import { GetProductsPaginatedUseCase } from "../../../application/use-cases/products/get-products-paginated";
import { UpdateProductUseCase } from "../../../application/use-cases/products/update-product";
import { DeleteProductUseCase } from "../../../application/use-cases/products/delete-product";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { AuxiliaryParameterModel } from "../../../infrastructure/database/models/auxiliary-parameter.model"; // Ajusta la ruta

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

    const whereConditions: any = { subscriptionId, isActive: true };
    if (type) {
      whereConditions.parameterType = (type as string).toUpperCase();
    }

    const parameters = await AuxiliaryParameterModel.findAll({
      where: whereConditions,
      order: [['name', 'ASC']],
      raw: true
    });

    return res.status(200).json({ status: "success", data: parameters });
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