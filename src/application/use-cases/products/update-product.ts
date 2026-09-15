import { ProductModel } from '../../../infrastructure/database/models/product.model';
import { AuxiliaryParameterModel } from '../../../infrastructure/database/models/auxiliary-parameter.model';

export class UpdateProductUseCase {
  async execute(productId: number, subscriptionId: number, data: any) {
    const product = await ProductModel.findOne({
      where: { id: productId, subscriptionId }
    });

    if (!product) {
      throw new Error('El producto solicitado no existe en el catálogo de su sucursal.');
    }

    // 1. Si cambian el precio o la afectación, re-evaluamos la deducción matemática del IGV
    const taxId = data.taxTypeParamId || product.taxTypeParamId;
    const priceToEvaluate = data.salesPrice !== undefined ? Number(data.salesPrice) : Number(product.salesPrice);
    const costToEvaluate = data.purchasePrice !== undefined ? Number(data.purchasePrice) : Number(product.purchasePrice);

    const taxParam = await AuxiliaryParameterModel.findOne({
      where: { id: taxId, subscriptionId },
      raw: true
    });

    if (taxParam) {
      const isGravado = taxParam.code.toUpperCase().includes('GRAVADO');
      const taxFactor = 1.18;

      // 🧠 CALCULO BRUTO EN MEMORIA RAM
      const calculatedPurchaseValue = isGravado ? (costToEvaluate / taxFactor) : costToEvaluate;
      const calculatedSalesValue = isGravado ? (priceToEvaluate / taxFactor) : priceToEvaluate;

      // 🎯 ¡LA CORRECCIÓN AQUÍ!: Forzamos el casteo a número primitivo float antes de aplicar el redondeo
      data.purchaseValue = parseFloat(Number(calculatedPurchaseValue).toFixed(4));
      data.salesValue = parseFloat(Number(calculatedSalesValue).toFixed(4));
    }

    // 2. Ejecutar la actualización en bloque de campos autorizados en MySQL
    await product.update(data);

    // 3. Forzamos un recargo fresco desde el disco para devolver la metadata limpia actualizada
    await product.reload();

    return product.get({ plain: true });
  }
}