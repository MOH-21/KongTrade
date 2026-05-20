import { useState } from "react";
import { X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { tradesApi } from "@/api/endpoints";
import type { TradeCreateRequest, AssetType, TradeSide } from "@/types";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TradeFormModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    symbol: "",
    asset_type: "stock" as AssetType,
    side: "buy" as TradeSide,
    quantity: "",
    entry_price: "",
    exit_price: "",
    entry_time: new Date().toISOString().slice(0, 16),
    exit_time: "",
    fees: "0",
    commission: "0",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: TradeCreateRequest) => tradesApi.create(data),
    onSuccess: () => {
      toast.success("Trade added");
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to add trade");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.quantity || !form.entry_price) return;

    createMutation.mutate({
      symbol: form.symbol,
      asset_type: form.asset_type,
      side: form.side,
      quantity: parseFloat(form.quantity),
      entry_price: parseFloat(form.entry_price),
      exit_price: form.exit_price ? parseFloat(form.exit_price) : undefined,
      entry_time: new Date(form.entry_time).toISOString(),
      exit_time: form.exit_time ? new Date(form.exit_time).toISOString() : undefined,
      fees: parseFloat(form.fees) || 0,
      commission: parseFloat(form.commission) || 0,
      notes: form.notes || undefined,
    });
  };

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Add Trade</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium">Symbol *</label>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => update("symbol", e.target.value.toUpperCase())}
                required
                placeholder="AAPL"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium">Asset Type</label>
              <select value={form.asset_type} onChange={(e) => update("asset_type", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="stock">Stock</option>
                <option value="option">Option</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Side</label>
              <select value={form.side} onChange={(e) => update("side", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <input type="number" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Entry Price *</label>
              <input type="number" step="any" value={form.entry_price} onChange={(e) => update("entry_price", e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Exit Price</label>
              <input type="number" step="any" value={form.exit_price} onChange={(e) => update("exit_price", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Entry Time</label>
              <input type="datetime-local" value={form.entry_time} onChange={(e) => update("entry_time", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Exit Time</label>
              <input type="datetime-local" value={form.exit_time} onChange={(e) => update("exit_time", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fees</label>
              <input type="number" step="any" value={form.fees} onChange={(e) => update("fees", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Commission</label>
              <input type="number" step="any" value={form.commission} onChange={(e) => update("commission", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? "Adding..." : "Add Trade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
