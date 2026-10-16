import { sequelizeInstance } from "../../../infrastructure/database/sequelize.config";
import { InvoiceHeaderModel } from "../../../infrastructure/database/models/invoice-header.model";
import { InvoiceDetailModel } from "../../../infrastructure/database/models/invoice-detail.model";
import { InvoicePaymentModel } from "../../../infrastructure/database/models/invoice-payment.model";
import { CompanyModel } from "../../../infrastructure/database/models/company.model";
import { AttachmentModel } from "../../../infrastructure/database/models/attachment.model";

// 🎯 INYECCIÓN DEL ORQUESTADOR CONECTADO A .NET 9
import { SunatOrchestratorService } from "../../../infrastructure/services/sunat-orchestrator.service";

export interface SinglePaymentInput {
  paymentMethod: "EFECTIVO" | "TARJETA_POS" | "TRANSFERENCIA" | "YAPE_PLIN";
  amountPaid: number;
  amountReceived: number;
  cashChange: number;
  transactionNumber?: string | null;
  evidencePath?: string | null;
}

export interface RegisterPaymentsInput {
  subscriptionId: number;
  companyId: number;
  branchId: number;
  userId: number;
  invoiceHeaderId: number;
  payments: SinglePaymentInput[];
}

export class RegisterPaymentsUseCase {
  // 🎯 El constructor recibe e inyecta de forma limpia el orquestador desacoplado
  constructor(
    private readonly sunatOrchestratorService: SunatOrchestratorService,
  ) {}

  async execute(data: RegisterPaymentsInput) {
    console.log(
      `=============== 💵 MOTOR FINANCIERO: RECAUDACIÓN COMBINADA ===============`,
    );
    console.log(
      `Procesando pagos para Factura ID: [${data.invoiceHeaderId}] | Medios de Pago: ${data.payments.length}`,
    );

    const transaction = await sequelizeInstance.transaction();

    // =========================================================================
    // 🎯 ELEVACIÓN DE SCOPE: Declaración limpia para lectura de retorno global
    // =========================================================================
    let invoiceRowToProcess: InvoiceHeaderModel | null = null;
    let finalStatus: "PAGADO" | "PARCIAL" | "PENDIENTE" = "PENDIENTE";
    let totalInvoiceAmount = 0;
    let accumulatedPaidAmount = 0; // 👉 Corregido: Inicializado de forma limpia
    let invoiceRow = null;
    try {
      // 1. 🔒 BLOQUEO ATÓMICO EN MYSQL (Aiven)
      invoiceRow = await InvoiceHeaderModel.findOne({
        where: {
          id: data.invoiceHeaderId,
          subscriptionId: data.subscriptionId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!invoiceRow) {
        throw new Error(
          "El comprobante electrónico seleccionado no existe en los registros del holding.",
        );
      }

      totalInvoiceAmount = Number(invoiceRow.get("totalVenta") || 0);

      // 2. 🧮 Sumamos el dinero ingresante en este lote
      let totalAmountPaidInThisBatch = 0;
      for (const p of data.payments) {
        totalAmountPaidInThisBatch += Number(p.amountPaid || 0);
      }

      // 3. Consultamos pagos históricos previos
      const previousPayments = await InvoicePaymentModel.findAll({
        where: {
          invoiceHeaderId: data.invoiceHeaderId,
          subscriptionId: data.subscriptionId,
        },
        transaction,
        raw: true,
      });

      let totalPreviouslyPaid = 0;
      for (const prev of previousPayments) {
        totalPreviouslyPaid += Number(prev.amountPaid || 0);
      }

      // 🎯 ASIGNACIÓN CORRECTA AL SCOPE SUPERIOR (Sin redeclarar con const/let)
      accumulatedPaidAmount = totalPreviouslyPaid + totalAmountPaidInThisBatch;

      if (accumulatedPaidAmount > totalInvoiceAmount + 0.01) {
        throw new Error(
          `Monto excedido. El total acumulado de pagos (S/ ${accumulatedPaidAmount.toFixed(2)}) supera el valor de venta del comprobante (S/ ${totalInvoiceAmount.toFixed(2)}).`,
        );
      }

      // 4. 💾 GUARDAR DETALLES DE PAGOS EN BLOQUE (Soporte Multi-medio)
      const paymentPayloads = data.payments.map((p) => ({
        subscriptionId: data.subscriptionId,
        companyId: data.companyId,
        branchId: data.branchId,
        invoiceHeaderId: data.invoiceHeaderId,
        userId: data.userId,
        paymentMethod: p.paymentMethod,
        amountPaid: Number(p.amountPaid),
        amountReceived: Number(p.amountReceived || p.amountPaid),
        cashChange: Number(p.cashChange || 0),
        transactionNumber: p.transactionNumber || null,
        evidencePath: p.evidencePath || null,
      }));

      await InvoicePaymentModel.bulkCreate(paymentPayloads, { transaction });

      // 5. 🎯 DETERMINAR EL ESTADO DE PAGO FINAL
      if (Math.abs(accumulatedPaidAmount - totalInvoiceAmount) < 0.05) {
        finalStatus = "PAGADO";
      } else if (accumulatedPaidAmount > 0) {
        finalStatus = "PARCIAL";
      }

      // Actualizamos físicamente el switch de cobranza en el registro de cabecera
      await invoiceRow.update({ paymentStatus: finalStatus }, { transaction });

      // Liberamos los candados ACID de MySQL de inmediato para mantener la BD elástica y rápida
      await transaction.commit();
      console.log(
        `✅ RECAUDACIÓN CONSOLIDADA EN DISCO. Estado Final de la Factura: [${finalStatus}]`,
      );

      invoiceRowToProcess = invoiceRow;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // =========================================================================
    // 📡 6. GATILLO CRIPTOGRÁFICO UNIFICADO HACIA EL MOTOR DE .NET 9
    // Si la factura se liquidó al 100%, Node.js consume la API asíncrona de .NET.
    // =========================================================================
    if (finalStatus === "PAGADO" && invoiceRowToProcess) {
      console.log(
        `🚀 [MOTOR .NET 9] Factura liquidada al 100%. Iniciando canalización de UBL 2.1 como CONTADO...`,
      );

      try {
            // Invocamos el método de tu orquestador que gatilla el POST protegido hacia .NET 9
            // Le pasamos el registro de Sequelize de la cabecera, las credenciales del tenant y fijamos el pago como "Contado"
            const orchestratorResult = await this.sunatOrchestratorService.processAndSend(invoiceRowToProcess);

            console.log(
              `[NODEJS] Comprobante enviado con éxito al procesador de .NET 9.`,
            );
        
      } catch (sunatError: any) {
        // Capturamos cualquier parpadeo de red o rechazo de SUNAT de forma segura en consola
        // pero la cobranza local de la base de datos se mantiene intacta y guardada (Resiliencia SaaS).
        console.error(
          `[ADVERTENCIA INFR] Falló el despacho fiscal intermedio de SUNAT: ${sunatError.message}`,
        );
      }
    }

    // Volvemos a recargar el registro fresco desde la base de datos para recuperar
    // los nuevos campos fiscales actualizados por el orquestador (sunatStatus, responseCode, etc.)
    const freshInvoice = await InvoiceHeaderModel.findByPk(
      data.invoiceHeaderId,
      {
        include: [{ model: InvoiceDetailModel, as: "Details" }], // Incluimos detalles para que Angular arme el Ticket de 80mm
      },
    );

    return {
      success: true,
      finalStatus,
      totalInvoiceAmount,
      totalPaidAmount: accumulatedPaidAmount,
      remanenteDebt: Number(
        (totalInvoiceAmount - accumulatedPaidAmount).toFixed(2),
      ),
      data: freshInvoice ? freshInvoice.toJSON() : null,
    };
  }
}
