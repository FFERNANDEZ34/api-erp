import { InvoiceHeaderModel } from "../../../infrastructure/database/models/invoice-header.model";
import { SunatOrchestratorService } from "../../../infrastructure/services/sunat-orchestrator.service";

export interface RetrySunatInput { invoiceId: number; }

export class RetrySunatUseCase {
  constructor(private readonly sunatOrchestratorService: SunatOrchestratorService) {}

  public async execute(input: RetrySunatInput): Promise<any> {
    const invoice = await InvoiceHeaderModel.findByPk(input.invoiceId);
    if (!invoice) throw new Error("El comprobante solicitado no existe.");
    
    if (invoice.sunatStatus === "ACEPTADO") {
      return { success: true, sunatStatus: "ACEPTADO", message: "Este comprobante ya fue aceptado con éxito." };
    }

    // 🔥 REUTILIZACIÓN ABSOLUTA: El mismo motor que corre en el create procesa el reenvío aquí
    const orchestratorResult = await this.sunatOrchestratorService.processAndSend(invoice);

    return {
      success: orchestratorResult.success,
      sunatStatus: orchestratorResult.sunatStatus,
      message: orchestratorResult.sunatDescription,
    };
  }
}