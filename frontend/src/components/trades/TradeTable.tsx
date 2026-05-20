import { useNavigate } from "react-router-dom";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Trade, TradeListParams } from "@/types";
import { formatCurrency, formatPercent, formatDateTime, pnlColor, cn } from "@/lib/utils";

interface TradeTableProps {
  trades: Trade[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  params: TradeListParams;
  onParamsChange: (params: TradeListParams) => void;
  isLoading?: boolean;
}

export default function TradeTable({
  trades,
  total,
  page,
  pageSize,
  totalPages,
  params,
  onParamsChange,
  isLoading,
}: TradeTableProps) {
  const navigate = useNavigate();

  const toggleSort = (field: string) => {
    onParamsChange({
      ...params,
      sort_by: field,
      sort_order: params.sort_by === field && params.sort_order === "desc" ? "asc" : "desc",
    });
  };

  const getRatingColor = (rating: string | null) => {
    if (!rating) return "text-muted-foreground";
    if (rating.startsWith("A")) return "text-gain";
    if (rating.startsWith("B")) return "text-green-400";
    if (rating === "C") return "text-yellow-500";
    if (rating === "D") return "text-orange-500";
    return "text-loss";
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="p-8 text-center text-sm text-muted-foreground">Loading trades...</div>
      </div>
    );
  }

  if (!trades.length) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="p-8 text-center text-sm text-muted-foreground">
          No trades yet. Connect a broker or add your first trade.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {[
                  { key: "symbol", label: "Symbol" },
                  { key: "side", label: "Side" },
                  { key: "quantity", label: "Qty" },
                  { key: "entry_price", label: "Entry" },
                  { key: "exit_price", label: "Exit" },
                  { key: "pnl", label: "P&L" },
                  { key: "entry_time", label: "Date" },
                  { key: "rating", label: "Rating" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort(key)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/trades/${trade.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      trade.side === "buy" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                    )}>
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{trade.quantity}</td>
                  <td className="px-4 py-3">${trade.entry_price.toFixed(2)}</td>
                  <td className="px-4 py-3">{trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : "--"}</td>
                  <td className={cn("px-4 py-3 font-medium", pnlColor(trade.pnl))}>
                    {trade.pnl !== null ? formatCurrency(trade.pnl) : "--"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDateTime(trade.entry_time)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("font-medium", getRatingColor(trade.rating))}>
                      {trade.rating || "--"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total} trades
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onParamsChange({ ...params, page: page - 1 })}
            className="rounded-lg p-2 hover:bg-accent disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => onParamsChange({ ...params, page: page + 1 })}
            className="rounded-lg p-2 hover:bg-accent disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
