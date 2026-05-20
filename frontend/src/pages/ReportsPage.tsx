import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/endpoints";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell,
} from "recharts";

type ReportType = "pnl" | "symbol" | "tag" | "time" | "metrics";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("pnl");

  const { data: pnlData, isLoading: pnlLoading } = useQuery({
    queryKey: ["report-pnl"],
    queryFn: () => reportsApi.pnlOverTime(),
    enabled: activeReport === "pnl",
  });
  const { data: symbolData } = useQuery({
    queryKey: ["report-symbol"],
    queryFn: reportsApi.bySymbol,
    enabled: activeReport === "symbol",
  });
  const { data: tagData } = useQuery({
    queryKey: ["report-tag"],
    queryFn: reportsApi.byTag,
    enabled: activeReport === "tag",
  });
  const { data: timeData } = useQuery({
    queryKey: ["report-time"],
    queryFn: reportsApi.byTime,
    enabled: activeReport === "time",
  });
  const { data: perfData } = useQuery({
    queryKey: ["report-perf"],
    queryFn: reportsApi.performance,
    enabled: activeReport === "metrics",
  });

  const reports: { key: ReportType; label: string }[] = [
    { key: "pnl", label: "P&L Over Time" },
    { key: "symbol", label: "By Symbol" },
    { key: "tag", label: "By Tag" },
    { key: "time", label: "By Day of Week" },
    { key: "metrics", label: "Key Metrics" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Reports & Analytics</h2>

      {/* Report Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {reports.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveReport(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeReport === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* P&L Over Time */}
      {activeReport === "pnl" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Cumulative P&L</h3>
          {pnlLoading ? (
            <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : pnlData && pnlData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={pnlData}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Cumulative P&L"]}
                />
                <Area type="monotone" dataKey="cumulative_pnl" stroke="#22c55e" fill="url(#pnlGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </div>
      )}

      {/* By Symbol */}
      {activeReport === "symbol" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Performance by Symbol</h3>
          {symbolData && symbolData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, (symbolData ?? []).length * 40)}>
              <BarChart data={symbolData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <YAxis dataKey="symbol" type="category" tick={{ fontSize: 12 }} width={60} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: number, name: string) => [name === "pnl" ? `$${value.toFixed(2)}` : `${value.toFixed(1)}%`, name]}
                />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                  {symbolData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </div>
      )}

      {/* By Tag */}
      {activeReport === "tag" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Performance by Tag</h3>
          {tagData && tagData.length > 0 ? (
            <div className="space-y-3">
              {tagData.map((t) => (
                <div key={t.tag_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{t.tag_name}</p>
                    <p className="text-xs text-muted-foreground">{t.trade_count} trades</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${t.pnl >= 0 ? "text-gain" : "text-loss"}`}>
                      {formatCurrency(t.pnl)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.win_rate.toFixed(1)}% win rate</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </div>
      )}

      {/* By Day of Week */}
      {activeReport === "time" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Performance by Day of Week</h3>
          {timeData && timeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ borderRadius: "8px" }} formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {timeData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </div>
      )}

      {/* Key Metrics */}
      {activeReport === "metrics" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Key Performance Metrics</h3>
          {perfData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Profit Factor", value: perfData.profit_factor.toFixed(2) },
                { label: "Expectancy", value: `$${perfData.expectancy.toFixed(2)}` },
                { label: "Sharpe Ratio", value: perfData.sharpe_ratio?.toFixed(2) || "N/A" },
                { label: "Avg R-Multiple", value: perfData.avg_r_multiple?.toFixed(2) || "N/A" },
                { label: "Avg Hold Time", value: perfData.avg_hold_time_hours ? `${perfData.avg_hold_time_hours.toFixed(1)}h` : "N/A" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </div>
      )}
    </div>
  );
}
