import { Router } from 'express';
import { CreateCompanyUseCase } from '../../../application/use-cases/companies/create-company';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../middlewares/async-handler.middleware';

const companyRouter = Router();

// Instanciamos el caso de uso y el controlador
const createCompanyUseCase = new CreateCompanyUseCase();
const companyController = new CompanyController(createCompanyUseCase);

// Forzamos a que todas las rutas de compañías requieran estar logueado
companyRouter.use(authMiddleware);

// Endpoint para crear las compañías de la suscripción (Máximo 3)
companyRouter.post('/', catchAsync((req: any, res: any) => companyController.create(req, res)));

export { companyRouter };