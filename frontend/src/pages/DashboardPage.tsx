import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Calendar,
  Zap,
  Activity,
} from "lucide-react";
import { dashboardApi } from "@/api/endpoints";
import { formatCurrency, formatPercent, formatDate, pnlColor, cn } from "@/lib/utils";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardApi.summary,
    refetchInterval: 30_000,
  });
  const { data: zella } = useQuery({
    queryKey: ["zella-score"],
    queryFn: dashboardApi.zellaScore,
  });
  const { data: streaks } = useQuery({
    queryKey: ["streaks"],
    queryFn: dashboardApi.streaks,
  });
  const { data: drawdown } = useQuery({
    queryKey: ["drawdown"],
    queryFn: dashboardApi.drawdown,
  });
  const { data: recentTrades } = useQuery({
    queryKey: ["recent-trades"],
    queryFn: dashboardApi.recentTrades,
  });

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasData = summary && summary.total_trades > 0;

  return (
    <div className="space-y-6">
      {/* Zella Score Banner */}
      {zella && hasData && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <h3 className="text-lg font-semibold">Zella Score</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Your overall trading health</p>
            </div>
            <div className="text-right">
              <p className={cn("text-4xl font-bold", zella.score >= 70 ? "text-gain" : zella.score >= 40 ? "text-yellow-500" : "text-loss")}>
                {zella.score}
              </p>
              <p className="text-xs text-muted-foreground">out of 100</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[
              { label: "Win Rate", value: zella.win_rate_score, weight: "30%" },
              { label: "Profit Factor", value: zella.profit_factor_score, weight: "25%" },
              { label: "Consistency", value: zella.consistency_score, weight: "20%" },
              { label: "Risk Mgmt", value: zella.risk_score, weight: "15%" },
              { label: "Quality", value: zella.quality_score, weight: "10%" },
            ].map(({ label, value, weight }) => (
              <div key={label} className="text-center">
                <div className="mx-auto h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
                </div>
                <p className="text-xs font-medium mt-1">{label}</p>
                <p className="text-xs text-muted-foreground">{value.toFixed(0)}%</p>
                <p className="text-[10px] text-muted-foreground">{weight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5" /> Net P&L
          </div>
          <p className={cn("text-2xl font-bold", pnlColor(summary?.net_pnl || 0))}>
            {summary ? formatCurrency(summary.net_pnl) : "--"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Target className="h-3.5 w-3.5" /> Win Rate
          </div>
          <p className="text-2xl font-bold">
            {summary ? `${summary.win_rate.toFixed(1)}%` : "--"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary ? `${summary.winning_trades}W / ${summary.losing_trades}L` : ""}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <BarChart3 className="h-3.5 w-3.5" /> Profit Factor
          </div>
          <p className="text-2xl font-bold">
            {summary ? summary.profit_factor.toFixed(2) : "--"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Activity className="h-3.5 w-3.5" /> Total Trades
          </div>
          <p className="text-2xl font-bold">{summary?.total_trades ?? "--"}</p>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Streaks & Drawdown */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="text-sm font-semibold mb-3">Streaks</h4>
          {streaks ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Win Streak</span>
                <span className="text-sm font-medium text-gain">{streaks.current_win_streak}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Loss Streak</span>
                <span className="text-sm font-medium text-loss">{streaks.current_loss_streak}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Best Win Streak</span>
                <span className="text-sm font-medium">{streaks.longest_win_streak}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Day Win Streak</span>
                <span className="text-sm font-medium">{streaks.current_day_win_streak}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}

          {drawdown && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3">Drawdown</h4>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Max Drawdown</span>
                <span className="text-sm font-medium text-loss">{formatCurrency(drawdown.max_drawdown)} ({drawdown.max_drawdown_percent}%)</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-muted-foreground">Avg Drawdown</span>
                <span className="text-sm font-medium text-loss">{formatCurrency(drawdown.avg_drawdown)} ({drawdown.avg_drawdown_percent}%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Best/Worst Days */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="text-sm font-semibold mb-3">Best & Worst Days</h4>
          {summary?.best_day ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Best Day</span>
                <div className="text-right">
                  <span className="text-sm font-medium text-gain">{formatCurrency(summary.best_day.pnl)}</span>
                  <p className="text-xs text-muted-foreground">{formatDate(summary.best_day.date)}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Worst Day</span>
                <div className="text-right">
                  <span className="text-sm font-medium text-loss">{formatCurrency(summary.worst_day!.pnl)}</span>
                  <p className="text-xs text-muted-foreground">{formatDate(summary.worst_day!.date)}</p>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Avg Win</span>
                <span className="text-sm font-medium text-gain">{formatCurrency(summary.avg_win)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg Loss</span>
                <span className="text-sm font-medium text-loss">{formatCurrency(summary.avg_loss)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Expectancy</span>
                <span className={cn("text-sm font-medium", pnlColor(summary.expectancy))}>{formatCurrency(summary.expectancy)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </div>

        {/* Recent Trades */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="text-sm font-semibold mb-3">Recent Trades</h4>
          {recentTrades && recentTrades.length > 0 ? (
            <div className="space-y-2">
              {recentTrades.slice(0, 6).map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => navigate(`/trades/${trade.id}`)}
                >
                  <div>
                    <span className="text-sm font-medium">{trade.symbol}</span>
                    <span className={cn("ml-2 text-xs", trade.side === "buy" ? "text-gain" : "text-loss")}>
                      {trade.side.toUpperCase()}
                    </span>
                  </div>
                  <span className={cn("text-sm font-medium", pnlColor(trade.pnl))}>
                    {trade.pnl !== null ? formatCurrency(trade.pnl, true) : "Open"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Calendar className="mx-auto h-8 w-8 mb-2 text-muted-foreground/50" />
              <p>No trades yet</p>
              <button
                onClick={() => navigate("/trades")}
                className="mt-2 text-primary hover:underline text-sm"
              >
                Add your first trade →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Welcome to KongTrade</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your Robinhood account to auto-import trades, or add your first trade manually to start tracking your performance.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/settings/brokers")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Connect Robinhood
            </button>
            <button
              onClick={() => navigate("/trades")}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Add Trade Manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
