import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { InvoiceHeaderModel } from '../../../infrastructure/database/models/invoice-header.model';
import { InvoicePaymentModel } from '../../../infrastructure/database/models/invoice-payment.model';

export interface SinglePaymentInput {
  paymentMethod: 'EFECTIVO' | 'TARJETA_POS' | 'TRANSFERENCIA' | 'YAPE_PLIN';
  amountPaid: number;      // Cuánto se abona a la factura desde este medio
  amountReceived: number;  // Con cuánto pagó en caja (para calcular vuelto)
  cashChange: number;      // Vuelto calculado
  transactionNumber?: string | null;
  evidencePath?: string | null; // Ruta ya procesada por el middleware de Multer
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
  async execute(data: RegisterPaymentsInput) {
    console.log(`=============== 💵 MOTOR FINANCIERO: RECAUDACIÓN COMBINADA ===============`);
    console.log(`Procesando pagos para Factura ID: [${data.invoiceHeaderId}] | Medios de Pago: ${data.payments.length}`);

    const transaction = await sequelizeInstance.transaction();

    try {
      // 1. 🔒 BLOQUEO ATÓMICO: Buscamos la factura bloqueando su fila para evitar doble pago simultáneo
      const invoiceRow = await InvoiceHeaderModel.findOne({
        where: { id: data.invoiceHeaderId, subscriptionId: data.subscriptionId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!invoiceRow) {
        throw new Error('El comprobante electrónico seleccionado no existe en los registros del holding.');
      }

      const totalInvoiceAmount = Number(invoiceRow.get('totalVenta') || 0);

      // 2. 🧮 Sumamos cuánto dinero total está ingresando en este lote de pagos
      let totalAmountPaidInThisBatch = 0;
      for (const p of data.payments) {
        totalAmountPaidInThisBatch += Number(p.amountPaid || 0);
      }

      // 3. Consultamos si ya tenía pagos previos registrados en la BD hacia esta factura
      const previousPayments = await InvoicePaymentModel.findAll({
        where: { invoiceHeaderId: data.invoiceHeaderId, subscriptionId: data.subscriptionId },
        transaction,
        raw: true
      });

      let totalPreviouslyPaid = 0;
      for (const prev of previousPayments) {
        totalPreviouslyPaid += Number(prev.amountPaid || 0);
      }

      const accumulatedPaidAmount = totalPreviouslyPaid + totalAmountPaidInThisBatch;

      if (accumulatedPaidAmount > totalInvoiceAmount + 0.01) {
        throw new Error(`Monto excedido. El total acumulado de pagos (S/ ${accumulatedPaidAmount.toFixed(2)}) supera el valor de venta del comprobante (S/ ${totalInvoiceAmount.toFixed(2)}).`);
      }

      // 4. 💾 GUARDAR DETALLES DE PAGOS EN BLOQUE (Soporta múltiples medios de pago simultáneos)
      const paymentPayloads = data.payments.map(p => ({
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
        evidencePath: p.evidencePath || null
      }));

      await InvoicePaymentModel.bulkCreate(paymentPayloads, { transaction });

      // 5. 🎯 DETERMINAR EL ESTADO DE PAGO FINAL
      let finalStatus: 'PAGADO' | 'PARCIAL' | 'PENDIENTE' = 'PENDIENTE';
      if (Math.abs(accumulatedPaidAmount - totalInvoiceAmount) < 0.05) {
        finalStatus = 'PAGADO';
      } else if (accumulatedPaidAmount > 0) {
        finalStatus = 'PARCIAL';
      }

      // Actualizamos físicamente el switch de cobranza en la cabecera del ticket
      await invoiceRow.update({ paymentStatus: finalStatus }, { transaction });

      await transaction.commit();
      console.log(`✅ RECAUDACIÓN CONSOLIDADA EN DISCO. Estado Final de la Factura: [${finalStatus}]`);

      return {
        success: true,
        finalStatus,
        totalInvoiceAmount,
        totalPaidAmount: accumulatedPaidAmount,
        remanenteDebt: Number((totalInvoiceAmount - accumulatedPaidAmount).toFixed(2))
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}