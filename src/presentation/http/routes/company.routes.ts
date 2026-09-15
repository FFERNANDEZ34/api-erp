import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";
import { CreateCompanyUseCase } from "../../../application/use-cases/companies/create-company";
import { GetCompaniesUseCase } from "../../../application/use-cases/companies/get-companies";
import { UpdateCompanyUseCase } from "../../../application/use-cases/companies/update-company";
import { DeleteCompanyUseCase } from "../../../application/use-cases/companies/delete-company";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { checkExchangeRateMiddleware } from "../../middlewares/check-exchange-rate.middleware";

const companyRouter = Router();

const createCompanyUseCase = new CreateCompanyUseCase();
const getCompaniesUseCase = new GetCompaniesUseCase();
const updateCompanyUseCase = new UpdateCompanyUseCase();
const deleteCompanyUseCase = new DeleteCompanyUseCase();

const companyController = new CompanyController(
  createCompanyUseCase,
  getCompaniesUseCase,
  updateCompanyUseCase,
  deleteCompanyUseCase
);

// Mapeado físico de Endpoints protegidos por Sesión y Candado de Tipo de Cambio
companyRouter.post("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => companyController.create(req, res));
companyRouter.get("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => companyController.getPaginated(req, res));
companyRouter.put("/:id", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => companyController.update(req, res));
companyRouter.delete("/:id", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => companyController.delete(req, res));

export { companyRouter };