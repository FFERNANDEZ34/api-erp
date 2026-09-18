import { sequelizeInstance } from '../../../infrastructure/database/sequelize.config';
import { InvoiceHeaderModel } from '../../../infrastructure/database/models/invoice-header.model';

export class CancelInvoiceUseCase {
  async execute(invoiceId: number, subscriptionId: number, companyId: number) {
    const transaction = await sequelizeInstance.transaction();

    try {
      // Buscamos la cabecera de la venta amarrada a los candados multi-tenant
      const invoice = await InvoiceHeaderModel.findOne({
        where: { id: invoiceId, subscriptionId, companyId },
        transaction
      });

      if (!invoice) {
        throw new Error('El comprobante solicitado no existe en los registros de su empresa.');
      }

      if (invoice.paymentStatus === 'ANULADO') {
        throw new Error('Operación redundante: El comprobante ya se encuentra anulado.');
      }

      // 🛡️ Restricción Fiscal: Si ya fue aceptada por SUNAT, se requiere Nota de Crédito obligatoria.
      // Pero para controles internos (Notas de Pedido o Presupuestos), liberamos la anulación directa.
      if (invoice.sunatStatus === 'ACEPTADO') {
        throw new Error('No se puede anular directamente una Factura/Boleta ACEPTADA por SUNAT. Debe emitir una Nota de Crédito oficial.');
      }

      // Mutamos los bits de estado de pago de forma segura
      await invoice.update({
        paymentStatus: 'ANULADO',
        sunatStatus: invoice.sunatStatus === 'PENDIENTE' ? 'ANULADO' : invoice.sunatStatus
      }, { transaction });

      await transaction.commit();
      return { id: invoice.id, fullDocumentNumber: invoice.fullDocumentNumber, status: 'ANULADO' };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}