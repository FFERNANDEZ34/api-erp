import { CompanyModel } from "../../../infrastructure/database/models/company.model";

export class CreateCompanyUseCase {
  async execute(data: { 
    subscriptionId: number; 
    userCompanyId: number | null; 
    userRole: string; // 👈 Asegúrate de que esta línea esté presente
    name: string; 
    ruc: string; 
  }) {
    // 🔒 Control de seguridad: Si no es el dueño principal, se rechaza
    if (data.userCompanyId !== null || data.userRole !== 'admin') {
      throw new Error('Operación denegada: Solo el administrador principal de la suscripción puede crear compañías.');
    }

    if (!/^\d{11}$/.test(data.ruc))
      throw new Error("El RUC debe tener exactamente 11 dígitos.");

    const rucExists = await CompanyModel.findOne({ where: { ruc: data.ruc } });
    if (rucExists)
      throw new Error("Este RUC ya está registrado en el sistema.");

    // Validar límite estricto de la demo
    const companiesCount = await CompanyModel.count({
      where: { subscriptionId: data.subscriptionId },
    });
    if (companiesCount >= 3) {
      throw new Error(
        "Límite alcanzado: Su suscripción Demo solo permite registrar un máximo de 3 compañías.",
      );
    }

    return await CompanyModel.create({
      subscriptionId: data.subscriptionId,
      name: data.name,
      ruc: data.ruc,
    });
  }
}
