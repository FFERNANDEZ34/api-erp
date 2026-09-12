import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { CreateCompanyUseCase } from '../../../application/use-cases/companies/create-company';
import { z } from 'zod';

export class CompanyController {
  constructor(private readonly createCompanyUseCase: CreateCompanyUseCase) {}

  async create(req: AuthenticatedRequest, res: Response) {
    // 1. Validar el cuerpo de la petición con Zod
    const companySchema = z.object({
      name: z.string().min(2, "El nombre de la compañía es requerido"),
      ruc: z.string().length(11, "El RUC debe tener exactamente 11 dígitos")
    });

    const body = companySchema.parse(req.body);
    
    // 2. Extraer las nuevas variables de jerarquía desde el JWT Payload
    const subscriptionId = req.user?.subscriptionId;
    const isGodMode = req.user?.isGodMode || false;

    if (!subscriptionId) {
      return res.status(401).json({ status: 'fail', message: 'No autorizado: Suscripción no válida.' });
    }

    // 3. Adaptar las variables de control para el caso de uso
    // Si isGodMode es true, simulamos que no está amarrado a ninguna compañía (null) y su rol es 'admin'
    const userCompanyId = isGodMode ? null : 1; // Cualquier valor != null bloqueará a usuarios comunes
    const userRole = isGodMode ? 'admin' : 'user';

    // 4. Despachar al caso de uso con el control corporativo unificado
    const newCompany = await this.createCompanyUseCase.execute({
      subscriptionId,
      userCompanyId,
      userRole,
      name: body.name,
      ruc: body.ruc
    });

    return res.status(201).json({
      status: 'success',
      message: 'Compañía registrada exitosamente dentro de su suscripción.',
      data: newCompany
    });
  }
}