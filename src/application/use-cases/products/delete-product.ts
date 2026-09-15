import { ProductModel } from '../../../infrastructure/database/models/product.model';

export class DeleteProductUseCase {
  async execute(productId: number, subscriptionId: number): Promise<void> {
    const product = await ProductModel.findOne({
      where: { id: productId, subscriptionId }
    });

    if (!product) {
      throw new Error('El producto que intenta dar de baja no existe en su holding.');
    }

    // 💥 BAJA LÓGICA HERMÉTICA: Inactivamos el flag en la base de datos de MySQL
    await product.update({ isActive: false });
  }
}