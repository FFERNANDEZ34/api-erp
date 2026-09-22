import { ProductModel } from '../../../infrastructure/database/models/product.model';
import { AuxiliaryParameterModel } from '../../../infrastructure/database/models/auxiliary-parameter.model';
import { Op } from 'sequelize';

export class GetKardexSummaryUseCase {
  async execute(params: { subscriptionId: number; companyId: number; search?: string }) {
    console.log(`📡 [RADAR LOGÍSTICO] Consolidando existencias rápidas para el holding [${params.subscriptionId}]`);

    // 🛡️ Candado defensivo: Inicializamos la asociación en caliente para evitar errores de Eager Loading
    if (!ProductModel.associations.UnitMeasureParameter) {
      ProductModel.belongsTo(AuxiliaryParameterModel, {
        foreignKey: 'unitMeasureParamId',
        targetKey: 'id',
        as: 'UnitMeasureParameter',
        constraints: false
      });
    }

    const whereCondition: any = {
      subscriptionId: params.subscriptionId,
      companyId: params.companyId
    };

    if (params.search) {
      whereCondition[Op.or] = [
        { productCode: { [Op.like]: `%${params.search}%` } },
        { name: { [Op.like]: `%${params.search}%` } }
      ];
    }

    const products = await ProductModel.findAll({
      where: whereCondition,
      include: [
        { model: AuxiliaryParameterModel, as: 'UnitMeasureParameter', required: false, attributes: ['name', 'code'] }
      ],
      order: [['name', 'ASC']],
      raw: true,
      nest: true // Mantiene el subobjeto limpio para Angular
    });

    // Barremos los artículos inyectando las métricas en RAM y el semáforo de stock mínimo
    return products.map((p: any) => {
      const currentStock = Number(p.stock || 0);
      const minStock = Number(p.minimumStock || 0);
      const isUnderMinimum = currentStock <= minStock;

      return {
        productId: p.id,
        productCode: p.productCode,
        productName: p.name,
        unitMeasureName: p.UnitMeasureParameter?.name || 'UNIDADES',
        unitMeasureCode: p.UnitMeasureParameter?.code || 'NIU',
        currentStock: currentStock,
        minimumStock: minStock,
        underMinimum: isUnderMinimum // 🔴 El switch definitivo para encender el rojo en Angular
      };
    });
  }
}