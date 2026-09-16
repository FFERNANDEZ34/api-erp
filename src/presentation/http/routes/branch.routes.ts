import { Router } from "express";
import { BranchController } from "../controllers/branch.controller";
import { CreateBranchUseCase } from "../../../application/use-cases/branches/create-branch";
import { GetBranchesUseCase } from "../../../application/use-cases/branches/get-branches";
import { UpdateBranchUseCase } from "../../../application/use-cases/branches/update-branch";
import { DeleteBranchUseCase } from "../../../application/use-cases/branches/delete-branch";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { checkExchangeRateMiddleware } from "../../middlewares/check-exchange-rate.middleware";

const branchRouter = Router();

const createBranchUseCase = new CreateBranchUseCase();
const getBranchesUseCase = new GetBranchesUseCase();
const updateBranchUseCase = new UpdateBranchUseCase();
const deleteBranchUseCase = new DeleteBranchUseCase();

const branchController = new BranchController(
  createBranchUseCase,
  getBranchesUseCase,
  updateBranchUseCase,
  deleteBranchUseCase
);

// Mapeado de Endpoints protegidos por Sesión y Candado Cambiario
branchRouter.post("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => branchController.create(req, res));
branchRouter.get("/", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => branchController.getPaginated(req, res));
branchRouter.put("/:id", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => branchController.update(req, res));
branchRouter.delete("/:id", authMiddleware, checkExchangeRateMiddleware, (req: any, res: any) => branchController.delete(req, res));

export { branchRouter };