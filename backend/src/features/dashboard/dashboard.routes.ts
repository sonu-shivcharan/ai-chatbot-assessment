import { Router } from "express";
import { getMetricsSummary, getMetricsTimeSeries } from "./dashboard.controller";

const dashboardRouter = Router();

dashboardRouter.get("/summary", getMetricsSummary);
dashboardRouter.get("/time-series", getMetricsTimeSeries);

export default dashboardRouter;
