import { InvoiceHeaderModel } from '../../../infrastructure/database/models/invoice-header.model';
import { InvoiceDetailModel } from '../../../infrastructure/database/models/invoice-detail.model';
import { InvoicePaymentModel } from '../../../infrastructure/database/models/invoice-payment.model';
import { ProductModel } from '../../../infrastructure/database/models/product.model';
import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { Op } from 'sequelize';

export interface DashboardFilterInput {
  subscriptionId: number;
  companyId?: number | null; // null significa "TODAS"
  branchId?: number | null;  // null significa "TODOS"
  year?: number;
}

export class GetManagerDashboardUseCase {
  async execute(filters: DashboardFilterInput) {
    const selectedYear = filters.year || new Date().getFullYear();
    console.log(`📊 [BÚNKER ANALÍTICO EN VIVO] Sincronizando Año: ${selectedYear} | Holding Multi-tenant: [${filters.subscriptionId}]`);

    // =========================================================================
    // 🛡️ 1. CONSTRUCCIÓN CON AUTORIDAD DE FILTROS (Cero Nulls Contaminantes)
    // =========================================================================
    const baseWhereInvoice: any = {
      subscriptionId: filters.subscriptionId,
      createdAt: {
        [Op.gte]: new Date(`${selectedYear}-01-01 00:00:00`),
        [Op.lte]: new Date(`${selectedYear}-12-31 23:59:59`)
      }
    };

    const baseWhereKardex: any = { subscriptionId: filters.subscriptionId };

    // 🎯 FILTRO JERÁRQUICO INTELIGENTE: Solo si el ID es numérico real lo inyectamos a Sequelize
    if (filters.companyId !== null && filters.companyId !== undefined && !isNaN(Number(filters.companyId))) {
      baseWhereInvoice.companyId = Number(filters.companyId);
      baseWhereKardex.companyId = Number(filters.companyId);
    }
    
    if (filters.branchId !== null && filters.branchId !== undefined && !isNaN(Number(filters.branchId))) {
      baseWhereInvoice.branchId = Number(filters.branchId);
      baseWhereKardex.branchId = Number(filters.branchId);
    }

    try {
      // =========================================================================
      // 🚀 CONSULTA A: TENDENCIA MENSUAL DE VENTAS (Gráfico de Líneas)
      // =========================================================================
      const monthlyTrendRaw = await InvoiceHeaderModel.findAll({
        where: baseWhereInvoice,
        attributes: [
          [sequelizeInstance.fn('MONTH', sequelizeInstance.col('createdAt')), 'monthNum'],
          [sequelizeInstance.fn('SUM', sequelizeInstance.col('totalVenta')), 'totalSales']
        ],
        group: [sequelizeInstance.fn('MONTH', sequelizeInstance.col('createdAt'))],
        raw: true
      });

      const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const trendChartData = monthsNames.map((name, index) => {
        const monthIndex = index + 1;
        const found = monthlyTrendRaw.find((m: any) => parseInt((m as any).monthNum) === monthIndex);
        
        // Evadimos rigidez del modelo con casting temporal
        const totalSalesRaw = found ? (found as any).totalSales : 0;
        
        return {
          label: name,
          value: Number(Number(totalSalesRaw).toFixed(2))
        };
      });

      // =========================================================================
      // 🚀 CONSULTA B: REPARTO PORCENTUAL DE MEDIOS DE PAGO (Gráfico de Torta)
      // =========================================================================
      const paymentMethodsRaw = await InvoicePaymentModel.findAll({
        where: baseWhereKardex,
        attributes: [
          'paymentMethod',
          [sequelizeInstance.fn('SUM', sequelizeInstance.col('amountPaid')), 'totalAmount']
        ],
        group: ['paymentMethod'],
        raw: true
      });

      const paymentChartData = paymentMethodsRaw.map((p: any) => ({
        name: p.paymentMethod,
        value: Number(Number((p as any).totalAmount).toFixed(2))
      }));

      // =========================================================================
      // 🚀 CONSULTA C: TOP 10 DE PRODUCTOS ESTRELLA (Alineado a tus campos reales)
      // =========================================================================
      if (!InvoiceDetailModel.associations.Product) {
        InvoiceDetailModel.belongsTo(ProductModel, { foreignKey: 'productId', as: 'Product' });
      }
       if (!InvoiceDetailModel.associations.InvoiceHeaderModel) {
        InvoiceDetailModel.belongsTo(InvoiceHeaderModel, { foreignKey: 'invoiceHeaderId' });
      }

      // 🛡️ FILTRO EXCLUSIVO DE DETALLES: No inyectamos subscriptionId porque tu tabla no la tiene nativa
      const detailWhereCondition: any = {};
      if (filters.companyId !== null && filters.companyId !== undefined && !isNaN(Number(filters.companyId))) {
        detailWhereCondition.companyId = Number(filters.companyId);
      }

     const topProductsRaw = await InvoiceDetailModel.findAll({
        where: {}, // Completamente limpio para erradicar el "Unknown column"
        attributes: [
          'productId',
          [sequelizeInstance.fn('SUM', sequelizeInstance.col('quantity')), 'totalQty'],
          [sequelizeInstance.fn('SUM', sequelizeInstance.col('subtotalPrice')), 'totalRevenue']
        ],
        include: [
          { 
            model: ProductModel, 
            as: 'Product', 
            attributes: ['name'], 
            required: false 
          },
          {
            model: InvoiceHeaderModel, // 👈 Consumimos el modelo directo
            attributes: [],            // No traemos columnas de cabecera, solo la usamos de filtro
            where: baseWhereInvoice,   // 🎯 Filtra por año, compañía y local de forma legítima
            required: true             // Hace un INNER JOIN para descartar lo que no calce
          }
        ],
        group: ['productId', 'Product.id'],
        order: [[sequelizeInstance.fn('SUM', sequelizeInstance.col('subtotalPrice')), 'DESC']],
        limit: 10,
        raw: true,
        nest: true
      });

      const topProductsChartData = topProductsRaw.map((p: any) => {
        const rawItem = p as any;
        return {
          productName: rawItem.Product?.name || `ID-${rawItem.productId}`,
          quantitySold: Number(rawItem.totalQty || 0),
          revenueGenerated: Number(Number(rawItem.totalRevenue || 0).toFixed(2))
        };
      });

      // =========================================================================
      // 🚀 CONSULTA D: KPI FINANCIERO DE PÉRDIDA POTENCIAL POR QUIEBRE
      // =========================================================================
      
      // Creamos un where exclusivo para el catálogo de productos
      // Evitamos inyectar 'branchId' aquí porque la tabla products no almacena sucursales nativas
      const productWhereCondition: any = {
        subscriptionId: filters.subscriptionId
      };
       // Si filtran por una compañía específica, lo aplicamos de forma segura al catálogo
      if (filters.companyId !== null && filters.companyId !== undefined && !isNaN(Number(filters.companyId))) {
        productWhereCondition.companyId = Number(filters.companyId);
      }

     const alertProducts = await ProductModel.findAll({
        where: {
          ...productWhereCondition, // 🎯 CONTRAFUERTE ATÓMICO: Cero filtrados parásitos de branchId
          stock: { [Op.lte]: sequelizeInstance.col('minimumStock') }
        },
        attributes: ['stock', 'minimumStock', 'salesPrice'],
        raw: true
      });

      let totalPotentialLoss = 0;
      alertProducts.forEach((p: any) => {
        const deficit = Number(p.minimumStock) - Number(p.stock);
        totalPotentialLoss += deficit * Number(p.salesPrice);
      });

      return {
        yearAnalyzed: selectedYear,
        financialSummary: {
          totalRevenuePeriod: trendChartData.reduce((acc, curr) => acc + curr.value, 0),
          potentialRiskInventoryValue: Number(totalPotentialLoss.toFixed(2))
        },
        charts: {
          monthlySalesTrend: trendChartData,
          paymentMethodsShare: paymentChartData,
          topSellingProducts: topProductsChartData
        }
      };

    } catch (dbError: any) {
      // Peritaje profundo si algo falla a nivel de motor SQL
      console.error('❌ [CRASH EN MYSQL DETECTADO]:', dbError.message);
      throw dbError;
    }
  }
}