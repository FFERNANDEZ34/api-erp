import { InvoiceHeaderModel } from "../../../infrastructure/database/models/invoice-header.model";
import { SunatOrchestratorService } from "../../../infrastructure/services/sunat-orchestrator.service";

export interface RetrySunatInput { 
  invoiceId: number; 
}

export class RetrySunatUseCase {
  // 🎯 Inyectamos el orquestador unificado que comunica con .NET 9
  constructor(private readonly sunatOrchestratorService: SunatOrchestratorService) {}

  public async execute(input: RetrySunatInput): Promise<any> {
    // 1. Recuperar el registro fresco de la cabecera desde MySQL
    const invoice = await InvoiceHeaderModel.findByPk(input.invoiceId);
    if (!invoice) {
      throw new Error("El comprobante solicitado no existe.");
    }
    
    // 🎯 REGLA DE PROTECCIÓN: Si ya fue aprobado, bloqueamos el reintento para evitar duplicidad de Hash
    if (invoice.sunatStatus === "ACEPTADO") {
      return { 
        success: true, 
        sunatStatus: "ACEPTADO", 
        message: "Este comprobante ya fue aceptado con éxito por la SUNAT." 
      };
    }

    try {
      console.log(`🚀 [REINTENTO TRIBUTARIO] Despachando Factura ID: [${input.invoiceId}] hacia el motor .NET 9...`);
      
      // 🔥 REUTILIZACIÓN COMPLETA: Tu orquestador internamente jala la compañía,
      // las llaves de Cloudflare, arma el JSON y dispara el POST hacia el microservicio
      const orchestratorResult = await this.sunatOrchestratorService.processAndSend(invoice);

      return {
        success: orchestratorResult.success,
        sunatStatus: orchestratorResult.sunatStatus,        // "ACEPTADO" o "RECHAZADO"
        message: orchestratorResult.sunatDescription,       // Mensaje oficial retornado
        xmlUrl: orchestratorResult.xmlUrl || "",            // URL de Cloudflare R2
        cdrUrl: orchestratorResult.cdrUrl || "",            // URL de Cloudflare R2
        observations: orchestratorResult.observations || [] // Alertas de contingencia o de SUNAT
      };

    } catch (error: any) {
      console.error(`🚨 Fallo en la tubería de reintento fiscal para la factura ${input.invoiceId}:`, error.message);
      return {
        success: false,
        sunatStatus: "PENDIENTE",
        message: `No se pudo completar el reintento debido a un problema de red: ${error.message}`,
        observations: ["Error temporal de comunicación con el motor de facturación .NET 9."]
      };
    }
  }
}