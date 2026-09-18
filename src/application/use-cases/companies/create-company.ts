import { CompanyModel } from "../../../infrastructure/database/models/company.model";

export interface CreateCompanyInput {
  subscriptionId: number;
  ruc: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  sunatUser?: string | null;
  sunatPassword?: string | null;
  certificatePassword?: string | null;
}

export class CreateCompanyUseCase {
  async execute(data: CreateCompanyInput) {
    const cleanRuc = data.ruc.trim();

    // 🛡️ Validar si ya existe el RUC registrado para este holding específico
    const existingCompany = await CompanyModel.findOne({
      where: { subscriptionId: data.subscriptionId, ruc: cleanRuc },
    });

    if (existingCompany) {
      throw new Error(
        `El RUC ${cleanRuc} ya se encuentra registrado en el catálogo de su holding.`,
      );
    }

    const newCompany = await CompanyModel.create({
      subscriptionId: data.subscriptionId,
      ruc: cleanRuc,
      name: data.name.trim(),
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      sunatUser: data.sunatUser?.trim() || null,
      sunatPassword: data.sunatPassword?.trim() || null,
      certificatePassword: data.certificatePassword?.trim() || null,
      isActive: true, // Nace activa por defecto
    });

    return newCompany.get({ plain: true });
  }
}
