import { Router } from "express";
import { CreateEntityUseCase } from "../../../application/use-cases/entities/create-entity";
import { GetEntitiesPaginatedUseCase } from "../../../application/use-cases/entities/get-entities-paginated";
import { EntityController } from "../controllers/entity.controller";
import { UpdateEntityUseCase } from "../../../application/use-cases/entities/update-entity";
import { DeleteEntityUseCase } from "../../../application/use-cases/entities/delete-entity";
import { ConsultPadronUseCase } from "../../../application/use-cases/entities/consult-padron";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { catchAsync } from "../../middlewares/async-handler.middleware";

const entityRouter = Router();

// 1. Instanciamos los Casos de Uso del Catálogo Maestro Compartido
const createEntityUseCase = new CreateEntityUseCase();
const getEntitiesPaginatedUseCase = new GetEntitiesPaginatedUseCase();
const updateEntityUseCase = new UpdateEntityUseCase();
const deleteEntityUseCase = new DeleteEntityUseCase();
const consultPadronUseCase = new ConsultPadronUseCase();
// 2. Inyectamos los Casos de Uso en el Controlador de Entidades
const entityController = new EntityController(
  createEntityUseCase,
  getEntitiesPaginatedUseCase,
  updateEntityUseCase,
  deleteEntityUseCase,
  consultPadronUseCase,
);

// 🔒 Forzamos a que todas las rutas del catálogo requieran un Token de Suscripción activo
entityRouter.use(authMiddleware);

entityRouter.post(
  "/",
  catchAsync((req: any, res: any) => entityController.create(req, res)),
);
entityRouter.get(
  "/",
  catchAsync((req: any, res: any) => entityController.getPaginated(req, res)),
);
entityRouter.put(
  "/:id",
  catchAsync((req: any, res: any) => entityController.update(req, res)),
);
entityRouter.delete(
  "/:id",
  catchAsync((req: any, res: any) => entityController.delete(req, res)),
);

entityRouter.get(
  "/padron/:type/:number",
  catchAsync((req: any, res: any) =>
    entityController.consultExternalPadron(req, res),
  ),
);

export { entityRouter };
