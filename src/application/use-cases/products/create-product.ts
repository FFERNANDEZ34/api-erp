import { ProductModel } from '../../../infrastructure/database/models/product.model';
import { AuxiliaryParameterModel } from '../../../infrastructure/database/models/auxiliary-parameter.model';

export interface CreateProductInput {
  subscriptionId: number;
  companyId: number; 
  productCode: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  barCode?: string | null;
  categoryId: number;
  brandId: number;
  currencyParamId: number;
  taxTypeParamId: number;
  unitMeasureParamId: number;
  purchasePrice: number; // Precio Compra enviado (Con Impuesto)
  salesPrice: number;    // Precio Venta enviado (Con Impuesto)
  minimumStock: number;
  isPackage?: boolean;
  allowSearch?: boolean;
}

export class CreateProductUseCase {
  async execute(data: CreateProductInput) {
    // 1. Verificar si el tipo de afectación existe para este SaaS
    const taxParam = await AuxiliaryParameterModel.findOne({
      where: { id: data.taxTypeParamId, subscriptionId: data.subscriptionId },
      raw: true
    });

    if (!taxParam) {
      throw new Error('El tipo de afectación tributaria seleccionado no es válido.');
    }

    // 2. 🧮 LÓGICA DE DEDUCCIÓN CONTABLE AUTOMÁTICA (IGV 18%)
    // Si el código del parámetro auxiliar contiene la palabra 'GRAVADO', extraemos el impuesto.
    // De lo contrario, el valor neto es equivalente al precio plano.
    const isGravado = taxParam.code.toUpperCase().includes('GRAVADO');
    const taxFactor = 1.18;

    const purchaseValue = isGravado ? (data.purchasePrice / taxFactor) : data.purchasePrice;
    const salesValue = isGravado ? (data.salesPrice / taxFactor) : data.salesPrice;

    // 3. Insertar de forma hermética el registro en MySQL a través de Sequelize
    const newProduct = await ProductModel.create({
      subscriptionId: data.subscriptionId,
      companyId: data.companyId,
      productCode: data.productCode.trim(),
      name: data.name.trim(),
      description: data.description || null,
      sku: data.sku || null,
      barCode: data.barCode || null,
      categoryId: data.categoryId,
      brandId: data.brandId,
      currencyParamId: data.currencyParamId,
      taxTypeParamId: data.taxTypeParamId,
      unitMeasureParamId: data.unitMeasureParamId,
      purchasePrice: data.purchasePrice,
      purchaseValue: parseFloat(purchaseValue.toFixed(4)), // Redondeo de alta precisión decimal
      salesPrice: data.salesPrice,
      salesValue: parseFloat(salesValue.toFixed(4)),
      minimumStock: data.minimumStock || 0.0000,
      isActive: true, // Nace activo de forma obligatoria
      isPackage: data.isPackage || false,
      allowSearch: data.allowSearch !== undefined ? data.allowSearch : true
    });

    await newProduct.reload();

    return newProduct.get({ plain: true });
  }
}