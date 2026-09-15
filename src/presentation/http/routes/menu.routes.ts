import { Router } from "express";
import { MenuController } from "../controllers/menu.controller";
import { GetAssignedMenuUseCase } from "../../../application/use-cases/menus/get-assigned-menu";
import { authMiddleware } from "../../middlewares/auth.middleware";

const menuRouter = Router();

const getAssignedMenuUseCase = new GetAssignedMenuUseCase();
const menuController = new MenuController(getAssignedMenuUseCase);

// 🔒 Dejamos la ruta limpia únicamente protegida por el authMiddleware base
menuRouter.get("/sidebar", authMiddleware, (req: any, res: any) =>
  menuController.getUserMenu(req, res),
);

export { menuRouter };
