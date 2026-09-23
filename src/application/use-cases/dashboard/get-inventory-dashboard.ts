import { ProductModel } from '../../../infrastructure/database/models/product.model';
import { InvoiceHeaderModel } from '../../../infrastructure/database/models/invoice-header.model';
import { InvoiceDetailModel } from '../../../infrastructure/database/models/invoice-detail.model';
import { ProductKardexModel } from '../../../infrastructure/database/models/product-kardex.model';
import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { Op } from 'sequelize';

export interface InventoryDashboardFilterInput {
  subscriptionId: number;
  companyId?: number | null;
  branchId?: number | null;
}

export class GetInventoryDashboardUseCase {
  async execute(filters: InventoryDashboardFilterInput) {
    console.log(`📦 [BÚNKER BI INVENTARIOS] Compilando analíticas de almacén holding: [${filters.subscriptionId}]`);

    // 🛡️ Filtros defensivos de cabecera libres de Nulls contaminantes
    const baseWhereInvoice: any = {
      subscriptionId: filters.subscriptionId
    };

    const productWhere: any = { subscriptionId: filters.subscriptionId };
    const kardexWhere: any = { subscriptionId: filters.subscriptionId };

    if (filters.companyId !== null && filters.companyId !== undefined && !isNaN(Number(filters.companyId))) {
      baseWhereInvoice.companyId = Number(filters.companyId);
      productWhere.companyId = Number(filters.companyId);
      kardexWhere.companyId = Number(filters.companyId);
    }
    if (filters.branchId !== null && filters.branchId !== undefined && !isNaN(Number(filters.branchId))) {
      baseWhereInvoice.branchId = Number(filters.branchId);
      kardexWhere.branchId = Number(filters.branchId);
    }

    try {
      // =========================================================================
      // 🚀 CONSULTA A: VALORIZACIÓN POR ARTÍCULO (100% INMUNE)
      // =========================================================================
      const valuationRaw = await ProductModel.findAll({
        where: productWhere,
        attributes: [
          [sequelizeInstance.col('name'), 'categoryName'],
          [sequelizeInstance.fn('SUM', sequelizeInstance.col('stock')), 'totalStock'],
          [sequelizeInstance.literal('SUM(stock * purchasePrice)'), 'totalValuation']
        ],
        group: ['name'],
        raw: true
      });

      const categoryValuationData = valuationRaw.map((v: any) => {
        const rawItem = v as any;
        return {
          categoryName: String(rawItem.categoryName).toUpperCase(),
          totalStock: Number(rawItem.totalStock || 0),
          totalValuation: Number(Number(rawItem.totalValuation || 0).toFixed(2))
        };
      });

      // =========================================================================
      // 🚀 CONSULTA B: MATRIZ ABC DE ROTACIÓN (BLINDADA CONTRA companyId EN DETALLE)
      // =========================================================================
      if (!InvoiceDetailModel.associations.InvoiceHeaderModel) {
        InvoiceDetailModel.belongsTo(InvoiceHeaderModel, { foreignKey: 'invoiceHeaderId' });
      }

      const rotationRaw = await InvoiceDetailModel.findAll({
        where: {}, // 🛡️ Totalmente limpio de companyId para erradicar el error 400
        attributes: [
          'productId',
          'productName',
          [sequelizeInstance.fn('SUM', sequelizeInstance.col('quantity')), 'unitsSold'],
          [sequelizeInstance.fn('SUM', sequelizeInstance.col('subtotalPrice')), 'revenueGenerated']
        ],
        include: [
          {
            model: InvoiceHeaderModel, // 🎯 FILTRADO LEGÍTIMO: Evaluamos la compañía y local en la cabecera
            attributes: [],
            where: baseWhereInvoice, 
            required: true // Fuerza un INNER JOIN contable perfecto
          }
        ],
        group: ['productId', 'productName'],
        order: [[sequelizeInstance.fn('SUM', sequelizeInstance.col('quantity')), 'DESC']],
        limit: 15,
        raw: true,
        nest: true
      });

      const abcRotationData = rotationRaw.map((r: any) => {
        const rawItem = r as any;
        const units = Number(rawItem.unitsSold || 0);
        let classification = 'C (Baja)';
        if (units > 30) classification = 'A (Alta)';
        else if (units > 10) classification = 'B (Media)';

        return {
          productName: rawItem.productName,
          unitsSold: units,
          revenue: Number(Number(rawItem.revenueGenerated || 0).toFixed(2)),
          classification
        };
      });

      // =========================================================================
      // 🚀 CONSULTA C: TENDENCIA DE MOVIMIENTOS EN KARDEX (Líneas comparativas)
      // =========================================================================
      const kardexTrendRaw = await ProductKardexModel.findAll({
        where: kardexWhere,
        attributes: [
          [sequelizeInstance.fn('MONTH', sequelizeInstance.col('createdAt')), 'monthNum'],
          'movementType',
          [sequelizeInstance.fn('SUM', sequelizeInstance.col('quantity')), 'totalQty']
        ],
        group: [sequelizeInstance.fn('MONTH', sequelizeInstance.col('createdAt')), 'movementType'],
        raw: true
      });

      const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const movementsTrendData = monthsNames.map((name, index) => {
        const monthIndex = index + 1;
        const ingressRow = kardexTrendRaw.find((k: any) => parseInt((k as any).monthNum) === monthIndex && (k as any).movementType === 'INGRESO');
        const egressRow = kardexTrendRaw.find((k: any) => parseInt((k as any).monthNum) === monthIndex && (k as any).movementType === 'SALIDA');

        return {
          month: name,
          ingresos: ingressRow ? Number((ingressRow as any).totalQty) : 0,
          salidas: egressRow ? Number((egressRow as any).totalQty) : 0
        };
      });

      // =========================================================================
      // 🚀 CONSULTA D: CONTADORES KPI PARA TARJETAS SUPERIORES
      // =========================================================================
      const totalItems = await ProductModel.count({ where: productWhere });
      const stockCritical = await ProductModel.count({
        where: {
          ...productWhere,
          stock: { [Op.lte]: sequelizeInstance.col('minimumStock') }
        }
      });

      const totalPhysicalUnits = categoryValuationData.reduce((acc, curr) => acc + curr.totalStock, 0);
      const totalCapitalInvested = categoryValuationData.reduce((acc, curr) => acc + curr.totalValuation, 0);

      return {
        kpis: {
          totalProductsInCatalog: totalItems,
          totalPhysicalUnits,
          totalCapitalInvested: Number(totalCapitalInvested.toFixed(2)),
          productsInCriticalStock: stockCritical
        },
        charts: {
          categoryValuation: categoryValuationData,
          abcRotation: abcRotationData,
          movementsTrend: movementsTrendData
        }
      };

    } catch (error: any) {
      console.error('❌ [CRASH EN INVENTORY BI DETECTADO]:', error.message);
      throw error;
    }
  }
}