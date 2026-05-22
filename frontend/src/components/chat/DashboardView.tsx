import { useState, useEffect } from "react";
import { Menu, RefreshCw, AlertCircle, Database, Clock, Server, Cpu, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";
import { useChat } from "@/context/ChatContext";
import {
  fetchDashboardSummary,
  fetchDashboardTimeSeries,
  type DashboardSummary,
  type DashboardTimeSeries,
} from "@/lib/api";

type TimeframeOption = "24h" | "7d" | "30d";

export function DashboardView() {
  const { isSidebarOpen, setIsSidebarOpen } = useChat();
  const [timeframe, setTimeframe] = useState<TimeframeOption>("24h");
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<DashboardTimeSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [summary, timeSeries] = await Promise.all([
        fetchDashboardSummary(timeframe),
        fetchDashboardTimeSeries(timeframe),
      ]);
      setSummaryData(summary);
      setTimeSeriesData(timeSeries);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [timeframe]);

  const stats = summaryData?.summary;

  // Custom SVG Chart computations
  const renderRequestChart = () => {
    if (!timeSeriesData || timeSeriesData.length === 0) {
      return (
        <div className="flex h-44 items-center justify-center text-xs text-muted-foreground italic border rounded-xl bg-muted/10">
          No request volume data available.
        </div>
      );
    }

    const padding = 30;
    const width = 600;
    const height = 150;
    const maxRequests = Math.max(...timeSeriesData.map((d) => d.totalRequests), 1);
    
    // Generate line points
    const points = timeSeriesData
      .map((d, i) => {
        const x = (i / Math.max(timeSeriesData.length - 1, 1)) * (width - padding * 2) + padding;
        const y = height - padding - (d.totalRequests / maxRequests) * (height - padding * 2);
        return { x, y, val: d.totalRequests, stamp: d.timestamp };
      });

    const pathD = points.length > 0 
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
      : "";

    const fillD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          <defs>
            <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
          <line x1={padding} y1={(height - padding * 2) / 2 + padding} x2={width - padding} y2={(height - padding * 2) / 2 + padding} stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" className="text-border" />
          
          {/* Area Fill */}
          {fillD && <path d={fillD} fill="url(#reqGradient)" />}
          
          {/* Path Line */}
          {pathD && <path d={pathD} fill="none" stroke="currentColor" className="text-primary" strokeWidth="2.5" />}
          
          {/* Point Dots */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="var(--background)"
              stroke="currentColor"
              className="text-primary"
              strokeWidth="2.5"
            />
          ))}

          {/* Time axis label endpoints */}
          {points.length > 0 && (
            <>
              <text x={points[0].x} y={height - 10} textAnchor="start" className="text-[10px] fill-muted-foreground font-medium">
                {formatTimestamp(points[0].stamp)}
              </text>
              <text x={points[points.length - 1].x} y={height - 10} textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">
                {formatTimestamp(points[points.length - 1].stamp)}
              </text>
            </>
          )}
        </svg>
      </div>
    );
  };

  const renderLatencyChart = () => {
    if (!timeSeriesData || timeSeriesData.length === 0) {
      return (
        <div className="flex h-44 items-center justify-center text-xs text-muted-foreground italic border rounded-xl bg-muted/10">
          No latency data available.
        </div>
      );
    }

    const padding = 30;
    const width = 600;
    const height = 150;
    const maxLatency = Math.max(...timeSeriesData.map((d) => d.avgLatencyMs), 1);

    const points = timeSeriesData
      .map((d, i) => {
        const x = (i / Math.max(timeSeriesData.length - 1, 1)) * (width - padding * 2) + padding;
        const y = height - padding - (d.avgLatencyMs / maxLatency) * (height - padding * 2);
        return { x, y, val: d.avgLatencyMs, stamp: d.timestamp };
      });

    const pathD = points.length > 0 
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
      : "";

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
          <line x1={padding} y1={(height - padding * 2) / 2 + padding} x2={width - padding} y2={(height - padding * 2) / 2 + padding} stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" className="text-border" />
          
          {/* Path Line */}
          {pathD && <path d={pathD} fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="2.5" />}
          
          {/* Point Dots */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="var(--background)"
              stroke="currentColor"
              className="text-emerald-500"
              strokeWidth="2.5"
            />
          ))}

          {/* Time axis label endpoints */}
          {points.length > 0 && (
            <>
              <text x={points[0].x} y={height - 10} textAnchor="start" className="text-[10px] fill-muted-foreground font-medium">
                {formatTimestamp(points[0].stamp)}
              </text>
              <text x={points[points.length - 1].x} y={height - 10} textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">
                {formatTimestamp(points[points.length - 1].stamp)}
              </text>
            </>
          )}
        </svg>
      </div>
    );
  };

  const formatTimestamp = (stampStr: string) => {
    if (timeframe === "24h") {
      // e.g. "2026-05-22 17:00" -> "17:00"
      const match = stampStr.match(/\d{2}:\d{2}$/);
      return match ? match[0] : stampStr;
    } else {
      // e.g. "2026-05-22" -> "May 22"
      try {
        const d = new Date(stampStr);
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      } catch {
        return stampStr;
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans text-foreground antialiased relative">
      <Sidebar />

      {/* DASHBOARD CONTENT */}
      <main className="flex flex-1 flex-col overflow-y-auto bg-background relative z-10">
        
        {/* HEADER */}
        <header className="flex h-16 items-center justify-between border-b px-6 backdrop-blur-md bg-background/80 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-foreground">Metrics & Analytics</h2>
              <span className="text-[10px] text-muted-foreground">
                Inference performance, latency and error tracking
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timeframe selector */}
            <div className="flex rounded-lg border bg-card p-1">
              {(["24h", "7d", "30d"] as TimeframeOption[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    timeframe === t
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={loadDashboardData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </header>

        {/* CONTAINER */}
        <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3 text-sm text-destructive items-center">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="flex-1 font-medium">{error}</span>
              <Button size="sm" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" onClick={loadDashboardData}>
                Retry
              </Button>
            </div>
          )}

          {isLoading && !summaryData ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground italic">Fetching metric aggregates...</p>
            </div>
          ) : (
            <>
              {/* SUMMARY GRID CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* CARD 1: Total requests */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wider">Total Calls</span>
                    <Database className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold tracking-tight">{stats?.totalRequests || 0}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {stats?.successRequests || 0} successful API inferences
                    </p>
                  </div>
                </div>

                {/* CARD 2: Avg Latency */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wider">Avg Latency</span>
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold tracking-tight">{stats?.avgLatencyMs || 0} ms</h3>
                    <p className="text-[10px] text-muted-foreground">
                      Time elapsed to complete stream
                    </p>
                  </div>
                </div>

                {/* CARD 3: Error Rate */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wider">Error Rate</span>
                    <Percent className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className={`text-2xl font-bold tracking-tight ${stats && stats.errorRate > 0 ? "text-destructive" : ""}`}>
                      {stats?.errorRate || 0}%
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {stats?.errorRequests || 0} failed requests in interval
                    </p>
                  </div>
                </div>

                {/* CARD 4: Tokens */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wider">Total Tokens</span>
                    <Cpu className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold tracking-tight">{stats?.totalTokens || 0}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {stats?.promptTokens || 0} prompt / {stats?.completionTokens || 0} completion
                    </p>
                  </div>
                </div>

              </div>

              {/* TIME SERIES CHARTS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CHART 1: Request Volume */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold">Request Volume Over Time</h4>
                    <p className="text-[10px] text-muted-foreground">Historical volume of inference attempts</p>
                  </div>
                  {renderRequestChart()}
                </div>

                {/* CHART 2: Latency Trend */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold">Average Latency Trend</h4>
                    <p className="text-[10px] text-muted-foreground">Response duration metric over time</p>
                  </div>
                  {renderLatencyChart()}
                </div>

              </div>

              {/* PROVIDERS COMPARISON TABLE */}
              <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                <div className="p-5 border-b">
                  <h4 className="text-sm font-semibold">Provider Performance Breakdown</h4>
                  <p className="text-[10px] text-muted-foreground">Aggregated stats sorted by volume</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 font-medium text-muted-foreground">
                        <th className="px-5 py-3 uppercase tracking-wider">Provider</th>
                        <th className="px-5 py-3 uppercase tracking-wider text-right">Requests</th>
                        <th className="px-5 py-3 uppercase tracking-wider text-right">Avg Latency</th>
                        <th className="px-5 py-3 uppercase tracking-wider text-right">Error Rate</th>
                        <th className="px-5 py-3 uppercase tracking-wider text-right">Tokens Consumed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summaryData?.providers && summaryData.providers.length > 0 ? (
                        summaryData.providers.map((p) => (
                          <tr key={p.provider} className="hover:bg-accent/30 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                              <Server className="h-3.5 w-3.5 text-muted-foreground" />
                              {p.provider}
                            </td>
                            <td className="px-5 py-3.5 text-right font-medium">{p.totalRequests}</td>
                            <td className="px-5 py-3.5 text-right font-medium text-emerald-500">{p.avgLatencyMs} ms</td>
                            <td className={`px-5 py-3.5 text-right font-medium ${p.errorRate > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              {p.errorRate}%
                            </td>
                            <td className="px-5 py-3.5 text-right text-muted-foreground">{p.totalTokens}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground italic">
                            No provider performance logs found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODELS COMPARISON TABLE */}
              <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                <div className="p-5 border-b">
                  <h4 className="text-sm font-semibold">Model Performance Details</h4>
                  <p className="text-[10px] text-muted-foreground">Granular metrics comparison of individual models</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 font-medium text-muted-foreground">
                        <th className="px-5 py-3 uppercase tracking-wider">Model Config</th>
                        <th className="px-5 py-3 uppercase tracking-wider">Provider</th>
                        <th className="px-5 py-3 uppercase tracking-wider text-right">Total Requests</th>
                        <th className="px-5 py-3 uppercase tracking-wider text-right">Avg Latency</th>
                        <th className="px-5 py-3 uppercase tracking-wider text-right">Error Rate</th>
                        <th className="px-5 py-3 uppercase tracking-wider text-right">Total Tokens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summaryData?.models && summaryData.models.length > 0 ? (
                        summaryData.models.map((m) => (
                          <tr key={`${m.provider}-${m.model}`} className="hover:bg-accent/30 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-foreground">
                              {m.model}
                            </td>
                            <td className="px-5 py-3.5 uppercase tracking-wider text-[10px] font-semibold text-muted-foreground">
                              {m.provider}
                            </td>
                            <td className="px-5 py-3.5 text-right font-medium">{m.totalRequests}</td>
                            <td className="px-5 py-3.5 text-right font-medium text-emerald-500">{m.avgLatencyMs} ms</td>
                            <td className={`px-5 py-3.5 text-right font-medium ${m.errorRate > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              {m.errorRate}%
                            </td>
                            <td className="px-5 py-3.5 text-right text-muted-foreground">{m.totalTokens}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground italic">
                            No model logs found in database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}

        </div>
      </main>
    </div>
  );
}
