import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Upload, Search, Filter } from "lucide-react";
import { tradesApi } from "@/api/endpoints";
import TradeTable from "@/components/trades/TradeTable";
import TradeFormModal from "@/components/trades/TradeFormModal";
import CsvImportDialog from "@/components/trades/CsvImportDialog";
import type { TradeListParams } from "@/types";

export default function TradesPage() {
  const [params, setParams] = useState<TradeListParams>({
    page: 1,
    page_size: 25,
    sort_by: "entry_time",
    sort_order: "desc",
  });
  const [showForm, setShowForm] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [searchSymbol, setSearchSymbol] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["trades", params],
    queryFn: () => tradesApi.list(params as Record<string, unknown> as never),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ ...params, symbol: searchSymbol || undefined, page: 1 });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Trade Log</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCsv(true)}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Trade
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            className="w-48 rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        <select
          value={params.asset_type || ""}
          onChange={(e) => setParams({ ...params, asset_type: (e.target.value || undefined) as never, page: 1 })}
          className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Assets</option>
          <option value="stock">Stocks</option>
          <option value="option">Options</option>
          <option value="crypto">Crypto</option>
        </select>
        <select
          value={params.side || ""}
          onChange={(e) => setParams({ ...params, side: (e.target.value || undefined) as never, page: 1 })}
          className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <select
          value={params.status || ""}
          onChange={(e) => setParams({ ...params, status: (e.target.value || undefined) as never, page: 1 })}
          className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Status</option>
          <option value="closed">Closed</option>
          <option value="open">Open</option>
        </select>
        {(params.symbol || params.asset_type || params.side || params.status) && (
          <button
            onClick={() => {
              setParams({ page: 1, page_size: 25, sort_by: "entry_time", sort_order: "desc" });
              setSearchSymbol("");
            }}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <TradeTable
        trades={data?.items || []}
        total={data?.total || 0}
        page={data?.page || 1}
        pageSize={data?.page_size || 25}
        totalPages={data?.total_pages || 1}
        params={params}
        onParamsChange={setParams}
        isLoading={isLoading}
      />

      {/* Modals */}
      {showForm && (
        <TradeFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}
      {showCsv && (
        <CsvImportDialog
          onClose={() => setShowCsv(false)}
          onSuccess={() => {
            setShowCsv(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
