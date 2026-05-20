import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Percent, Clock, Calendar, Tag as TagIcon, FileText } from "lucide-react";
import { tradesApi } from "@/api/endpoints";
import { formatCurrency, formatPercent, formatDateTime, pnlColor, cn } from "@/lib/utils";

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: trade, isLoading } = useQuery({
    queryKey: ["trade", id],
    queryFn: () => tradesApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Trade not found</p>
      </div>
    );
  }

  const isWin = trade.pnl !== null && trade.pnl > 0;
  const isLoss = trade.pnl !== null && trade.pnl < 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/trades")} className="rounded-lg p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{trade.symbol}</h2>
            <span className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
              trade.side === "buy" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
            )}>
              {trade.side.toUpperCase()}
            </span>
            <span className="text-sm text-muted-foreground">{trade.asset_type}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateTime(trade.entry_time)}
            {trade.exit_time && ` → ${formatDateTime(trade.exit_time)}`}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="P&L"
          value={trade.pnl !== null ? formatCurrency(trade.pnl) : "--"}
          subvalue={trade.pnl_percent !== null ? formatPercent(trade.pnl_percent) : undefined}
          trend={isWin ? "up" : isLoss ? "down" : "neutral"}
          icon={DollarSign}
        />
        <MetricCard
          label="Entry Price"
          value={`$${trade.entry_price.toFixed(2)}`}
          icon={TrendingUp}
        />
        <MetricCard
          label="Exit Price"
          value={trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : "Open"}
          icon={TrendingDown}
        />
        <MetricCard
          label="Quantity"
          value={trade.quantity.toString()}
          icon={Percent}
        />
        <MetricCard
          label="Fees"
          value={`$${trade.fees.toFixed(2)}`}
          icon={DollarSign}
        />
        <MetricCard
          label="Commission"
          value={`$${trade.commission.toFixed(2)}`}
          icon={DollarSign}
        />
        <MetricCard
          label="Status"
          value={trade.status}
          icon={Clock}
        />
        <MetricCard
          label="Rating"
          value={trade.rating || "--"}
          icon={TagIcon}
        />
      </div>

      {/* Notes */}
      {trade.notes && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Notes</h3>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trade.notes}</p>
        </div>
      )}

      {/* Tags */}
      {trade.tags_data && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <TagIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Tags</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(trade.tags_data).map(([category, tags]) =>
              (tags as string[]).map((tag: string) => (
                <span key={`${category}-${tag}`} className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {tag}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chart placeholder */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">Price Chart</h3>
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-lg">
          Chart integration coming soon
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subvalue,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  subvalue?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn(
        "text-lg font-bold",
        trend === "up" && "text-gain",
        trend === "down" && "text-loss"
      )}>
        {value}
      </p>
      {subvalue && <p className={cn("text-xs mt-0.5", pnlColor(trend === "up" ? 1 : trend === "down" ? -1 : 0))}>{subvalue}</p>}
    </div>
  );
}
