import { CompanyModel } from '../../../infrastructure/database/models/company.model';

export class UpdateCompanyUseCase {
  async execute(companyId: number, subscriptionId: number, data: any) {
    const company = await CompanyModel.findOne({
      where: { id: companyId, subscriptionId }
    });

    if (!company) {
      throw new Error('La empresa comercial solicitada no existe o no pertenece a su cuenta.');
    }

    // Si intentan modificar el RUC, validamos que no colisione con otra empresa existente
    if (data.ruc && data.ruc.trim() !== company.ruc) {
      const cleanRuc = data.ruc.trim();
      const duplicateRuc = await CompanyModel.findOne({
        where: { subscriptionId, ruc: cleanRuc }
      });
      if (duplicateRuc) {
        throw new Error(`No se puede actualizar: El RUC ${cleanRuc} ya le pertenece a otra de sus empresas.`);
      }
      data.ruc = cleanRuc;
    }

    await company.update(data);
    return company.get({ plain: true });
  }
}