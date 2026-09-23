import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { GetManagerDashboardUseCase } from "../../../application/use-cases/dashboard/get-manager-dashboard";
import { GetInventoryDashboardUseCase } from "../../../application/use-cases/dashboard/get-inventory-dashboard";

export class DashboardController {
  constructor(
    private readonly getManagerDashboardUseCase: GetManagerDashboardUseCase,
    private readonly getInventoryDashboardUseCase: GetInventoryDashboardUseCase,
  ) {}

  async getExecutiveMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;

      // Capturamos los filtros opcionales. Si viaja la palabra 'ALL' o viene vacío, lo seteamos como null
      const companyQuery = req.query.companyId as string;
      const branchQuery = req.query.branchId as string;
      const yearQuery = req.query.year as string;

      const companyId =
        !companyQuery || companyQuery === "ALL" ? null : parseInt(companyQuery);
      const branchId =
        !branchQuery || branchQuery === "ALL" ? null : parseInt(branchQuery);
      const year = yearQuery ? parseInt(yearQuery) : new Date().getFullYear();

      if (!subscriptionId) {
        return res
          .status(401)
          .json({
            status: "fail",
            message: "Identificación multi-tenant inválida.",
          });
      }

      const result = await this.getManagerDashboardUseCase.execute({
        subscriptionId,
        companyId,
        branchId,
        year,
      });

      return res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (error: any) {
      console.error("🚨 [ERROR CONTROLADO BI DASHBOARD]:", error.message);
      return res.status(400).json({
        status: "fail",
        message:
          error.message ||
          "Error al compilar la matriz de analíticas gerenciales.",
      });
    }
  }

  async getInventoryMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionId = req.user?.subscriptionId;
      const companyQuery = req.query.companyId as string;
      const branchQuery = req.query.branchId as string;

      const companyId =
        !companyQuery || companyQuery === "ALL" ? null : parseInt(companyQuery);
      const branchId =
        !branchQuery || branchQuery === "ALL" ? null : parseInt(branchQuery);

      if (!subscriptionId) {
        return res
          .status(401)
          .json({ status: "fail", message: "Sesión expirada o inválida." });
      }

      const result = await this.getInventoryDashboardUseCase.execute({
        subscriptionId,
        companyId,
        branchId,
      });

      return res.status(200).json({ status: "success", data: result });
    } catch (error: any) {
      return res
        .status(400)
        .json({
          status: "fail",
          message: error.message || "Error al procesar el BI logístico.",
        });
    }
  }
}
