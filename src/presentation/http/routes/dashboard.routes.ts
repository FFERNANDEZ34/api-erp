import { Router } from 'express';
import { GetManagerDashboardUseCase } from '../../../application/use-cases/dashboard/get-manager-dashboard';
import { GetInventoryDashboardUseCase } from '../../../application/use-cases/dashboard/get-inventory-dashboard'; // 🚀 IMPORTA AQUÍ

import { DashboardController } from '../controllers/dashboard.controller';
import { catchAsync } from '../../middlewares/async-handler.middleware';

const dashboardRouter = Router();

const getManagerDashboardUseCase = new GetManagerDashboardUseCase();
const getInventoryDashboardUseCase = new GetInventoryDashboardUseCase(); 

const dashboardController = new DashboardController(getManagerDashboardUseCase,getInventoryDashboardUseCase);

// El endpoint queda expuesto de forma limpia mediante método GET
dashboardRouter.get('/executive-metrics', catchAsync((req: any, res: any) => dashboardController.getExecutiveMetrics(req, res)));
dashboardRouter.get('/inventory-metrics', catchAsync((req: any, res: any) => dashboardController.getInventoryMetrics(req, res)));



export { dashboardRouter };