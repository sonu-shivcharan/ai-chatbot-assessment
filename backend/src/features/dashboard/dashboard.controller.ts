import { asyncHandler } from "../../utils/async-handler";
import { InferenceLog } from "../../models/inference-logs.model";
import ApiResponse from "../../utils/api-response";

/**
 * Helper to compute startDate based on timeframe parameter
 */
function getStartDateForTimeframe(timeframe: string): Date {
  const startDate = new Date();
  if (timeframe === "7d") {
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeframe === "30d") {
    startDate.setDate(startDate.getDate() - 30);
  } else {
    // Default to 24h
    startDate.setHours(startDate.getHours() - 24);
  }
  return startDate;
}

/**
 * GET /api/dashboard/summary
 * Retrieves overall metric aggregates and provider/model breakdowns.
 */
export const getMetricsSummary = asyncHandler(async (req, res) => {
  const timeframe = (req.query.timeframe as string) || "24h";
  const startDate = getStartDateForTimeframe(timeframe);

  // 1. Overall aggregates
  const overall = await InferenceLog.aggregate([
    { $match: { startedAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successRequests: {
          $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
        },
        errorRequests: {
          $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] },
        },
        avgLatencyMs: { $avg: "$latencyMs" },
        totalTokens: { $sum: "$totalTokens" },
        promptTokens: { $sum: "$promptTokens" },
        completionTokens: { $sum: "$completionTokens" },
      },
    },
  ]);

  const summary = overall[0] || {
    totalRequests: 0,
    successRequests: 0,
    errorRequests: 0,
    avgLatencyMs: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
  };

  const errorRate = summary.totalRequests > 0 
    ? (summary.errorRequests / summary.totalRequests) * 100 
    : 0;

  // 2. Provider breakdown
  const providers = await InferenceLog.aggregate([
    { $match: { startedAt: { $gte: startDate } } },
    {
      $group: {
        _id: "$provider",
        totalRequests: { $sum: 1 },
        successRequests: {
          $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
        },
        errorRequests: {
          $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] },
        },
        avgLatencyMs: { $avg: "$latencyMs" },
        totalTokens: { $sum: "$totalTokens" },
      },
    },
    { $sort: { totalRequests: -1 } },
  ]);

  // 3. Model breakdown
  const models = await InferenceLog.aggregate([
    { $match: { startedAt: { $gte: startDate } } },
    {
      $group: {
        _id: { provider: "$provider", model: "$model" },
        totalRequests: { $sum: 1 },
        successRequests: {
          $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
        },
        errorRequests: {
          $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] },
        },
        avgLatencyMs: { $avg: "$latencyMs" },
        totalTokens: { $sum: "$totalTokens" },
      },
    },
    { $sort: { totalRequests: -1 } },
  ]);

  const result = {
    timeframe,
    summary: {
      ...summary,
      errorRate: parseFloat(errorRate.toFixed(2)),
      avgLatencyMs: Math.round(summary.avgLatencyMs || 0),
    },
    providers: providers.map((p) => ({
      provider: p._id,
      totalRequests: p.totalRequests,
      successRequests: p.successRequests,
      errorRequests: p.errorRequests,
      errorRate: parseFloat(((p.errorRequests / p.totalRequests) * 100).toFixed(2)),
      avgLatencyMs: Math.round(p.avgLatencyMs || 0),
      totalTokens: p.totalTokens,
    })),
    models: models.map((m) => ({
      provider: m._id.provider,
      model: m._id.model,
      totalRequests: m.totalRequests,
      successRequests: m.successRequests,
      errorRequests: m.errorRequests,
      errorRate: parseFloat(((m.errorRequests / m.totalRequests) * 100).toFixed(2)),
      avgLatencyMs: Math.round(m.avgLatencyMs || 0),
      totalTokens: m.totalTokens,
    })),
  };

  return res.status(200).json(
    new ApiResponse(200, result, "Dashboard summary stats fetched successfully")
  );
});

/**
 * GET /api/dashboard/time-series
 * Retrieves chronologically bucketed aggregates (request counts, errors, latencies, tokens).
 */
export const getMetricsTimeSeries = asyncHandler(async (req, res) => {
  const timeframe = (req.query.timeframe as string) || "24h";
  const startDate = getStartDateForTimeframe(timeframe);

  // Group by hour for 24h timeframe, otherwise group by day
  const format = timeframe === "24h" ? "%Y-%m-%d %H:00" : "%Y-%m-%d";

  const timeSeries = await InferenceLog.aggregate([
    { $match: { startedAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: format, date: "$startedAt", timezone: "UTC" },
        },
        totalRequests: { $sum: 1 },
        successRequests: {
          $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
        },
        errorRequests: {
          $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] },
        },
        avgLatencyMs: { $avg: "$latencyMs" },
        totalTokens: { $sum: "$totalTokens" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const result = timeSeries.map((ts) => ({
    timestamp: ts._id,
    totalRequests: ts.totalRequests,
    successRequests: ts.successRequests,
    errorRequests: ts.errorRequests,
    errorRate: parseFloat(((ts.errorRequests / ts.totalRequests) * 100).toFixed(2)),
    avgLatencyMs: Math.round(ts.avgLatencyMs || 0),
    totalTokens: ts.totalTokens,
  }));

  return res.status(200).json(
    new ApiResponse(200, result, "Dashboard time-series metrics fetched successfully")
  );
});
