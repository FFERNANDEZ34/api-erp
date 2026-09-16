import { DocumentSeriesModel } from '../../../infrastructure/database/models/document-series.model';

export interface CreateSeriesInput {
  subscriptionId: number;
  companyId: number;
  branchId?: number | null;
  documentType: string; // 'FACTURA', 'BOLETA', 'NOTA_PEDIDO', 'ORDEN_INGRESO', etc.
  series: string;        // Ej: 'F001', 'NP01', 'OI01'
  currentNumber?: number;
  description?: string | null;
}

export class CreateSeriesUseCase {
  async execute(data: CreateSeriesInput) {
    const cleanSeries = data.series.trim().toUpperCase();
    const cleanType = data.documentType.trim().toUpperCase();

    // 🛡️ Regla de Validación de Formato de Series (Máximo 4 Caracteres)
    if (cleanSeries.length > 4) {
      throw new Error('El código del talonario o serie no puede exceder los 4 caracteres.');
    }

    // 🕵️‍♂️ Control de Duplicidad Multi-tenant por Empresa
    const existingSeries = await DocumentSeriesModel.findOne({
      where: {
        subscriptionId: data.subscriptionId,
        companyId: data.companyId,
        documentType: cleanType,
        series: cleanSeries
      }
    });

    if (existingSeries) {
      throw new Error(`El talonario con la serie ${cleanSeries} ya se encuentra registrado para el tipo de documento ${cleanType} en esta empresa.`);
    }

    const newSeries = await DocumentSeriesModel.create({
      subscriptionId: data.subscriptionId,
      companyId: data.companyId,
      branchId: data.branchId || null,
      documentType: cleanType,
      series: cleanSeries,
      currentNumber: data.currentNumber !== undefined ? Number(data.currentNumber) : 0, // Permite arrancar la numeración en un número específico (ej: si ya emitieron en papel antes)
      description: data.description?.trim() || null,
      isActive: true
    });

    return newSeries.get({ plain: true });
  }
}