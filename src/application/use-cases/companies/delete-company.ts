import { CompanyModel } from '../../../infrastructure/database/models/company.model';

export class DeleteCompanyUseCase {
  async execute(companyId: number, subscriptionId: number): Promise<void> {
    const company = await CompanyModel.findOne({
      where: { id: companyId, subscriptionId }
    });

    if (!company) {
      throw new Error('La empresa que intenta dar de baja no existe en su holding.');
    }

    // 🔒 BAJA LÓGICA POR FLAG: Nunca destruimos registros para mantener la integridad de llaves foráneas
    await company.update({ isActive: false });
  }
}