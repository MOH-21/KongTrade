import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { playbooksApi } from "@/api/endpoints";

interface CriteriaRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export default function PlaybookBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = id && id !== "new";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assetTypes, setAssetTypes] = useState<string[]>(["stock"]);
  const [entryRules, setEntryRules] = useState<CriteriaRule[]>([]);
  const [exitRules, setExitRules] = useState<CriteriaRule[]>([]);
  const [riskRules, setRiskRules] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["playbook", id],
    queryFn: () => playbooksApi.get(id!),
    enabled: !!isEditing,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description || "");
      setAssetTypes(existing.asset_types || ["stock"]);
      // Parse criteria back to rules (simplified)
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: (data: Parameters<typeof playbooksApi.create>[0]) =>
      isEditing ? playbooksApi.update(id!, data) : playbooksApi.create(data),
    onSuccess: () => {
      toast.success(isEditing ? "Playbook updated" : "Playbook created");
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      navigate("/playbooks");
    },
    onError: () => toast.error("Failed to save"),
  });

  const addRule = (type: "entry" | "exit") => {
    const rule: CriteriaRule = { id: crypto.randomUUID(), field: "", operator: ">", value: "" };
    if (type === "entry") setEntryRules([...entryRules, rule]);
    else setExitRules([...exitRules, rule]);
  };

  const removeRule = (type: "entry" | "exit", id: string) => {
    if (type === "entry") setEntryRules(entryRules.filter((r) => r.id !== id));
    else setExitRules(exitRules.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    saveMutation.mutate({
      name: name.trim(),
      description: description || undefined,
      asset_types: assetTypes,
      entry_criteria: entryRules.length > 0 ? { rules: entryRules.map(({ field, operator, value }) => ({ field, operator, value })) } : undefined,
      exit_criteria: exitRules.length > 0 ? { rules: exitRules.map(({ field, operator, value }) => ({ field, operator, value })) } : undefined,
      risk_rules: riskRules ? { max_loss_percent: parseFloat(riskRules) || undefined } : undefined,
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/playbooks")} className="rounded-lg p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">{isEditing ? "Edit Playbook" : "New Playbook"}</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || !name.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Name & Description */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., VWAP Pullback, Opening Range Breakout"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Describe your strategy..."
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Asset Types</label>
          <div className="flex gap-2">
            {["stock", "option", "crypto", "futures", "forex"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  if (assetTypes.includes(type)) {
                    setAssetTypes(assetTypes.filter((t) => t !== type));
                  } else {
                    setAssetTypes([...assetTypes, type]);
                  }
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  assetTypes.includes(type)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Entry Criteria */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Entry Criteria</h3>
          <button onClick={() => addRule("entry")} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add Rule
          </button>
        </div>
        {entryRules.length === 0 && (
          <p className="text-sm text-muted-foreground">No entry rules. Click "+ Add Rule" to define criteria.</p>
        )}
        {entryRules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-2 mb-2">
            <input
              placeholder="Field (e.g. price, volume, rsi)"
              value={rule.field}
              onChange={(e) => {
                const updated = entryRules.map((r) => (r.id === rule.id ? { ...r, field: e.target.value } : r));
                setEntryRules(updated);
              }}
              className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={rule.operator}
              onChange={(e) => {
                const updated = entryRules.map((r) => (r.id === rule.id ? { ...r, operator: e.target.value } : r));
                setEntryRules(updated);
              }}
              className="w-20 rounded-lg border bg-background px-2 py-1.5 text-xs"
            >
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
              <option value="==">=</option>
              <option value="crosses_above">↑ crosses</option>
              <option value="crosses_below">↓ crosses</option>
            </select>
            <input
              placeholder="Value"
              value={rule.value}
              onChange={(e) => {
                const updated = entryRules.map((r) => (r.id === rule.id ? { ...r, value: e.target.value } : r));
                setEntryRules(updated);
              }}
              className="w-24 rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={() => removeRule("entry", rule.id)} className="text-muted-foreground hover:text-loss">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Exit Criteria */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Exit Criteria</h3>
          <button onClick={() => addRule("exit")} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add Rule
          </button>
        </div>
        {exitRules.length === 0 && (
          <p className="text-sm text-muted-foreground">No exit rules defined.</p>
        )}
        {exitRules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-2 mb-2">
            <input
              placeholder="Field"
              value={rule.field}
              onChange={(e) => {
                const updated = exitRules.map((r) => (r.id === rule.id ? { ...r, field: e.target.value } : r));
                setExitRules(updated);
              }}
              className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={rule.operator}
              onChange={(e) => {
                const updated = exitRules.map((r) => (r.id === rule.id ? { ...r, operator: e.target.value } : r));
                setExitRules(updated);
              }}
              className="w-20 rounded-lg border bg-background px-2 py-1.5 text-xs"
            >
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
              <option value="==">=</option>
            </select>
            <input
              placeholder="Value"
              value={rule.value}
              onChange={(e) => {
                const updated = exitRules.map((r) => (r.id === rule.id ? { ...r, value: e.target.value } : r));
                setExitRules(updated);
              }}
              className="w-24 rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={() => removeRule("exit", rule.id)} className="text-muted-foreground hover:text-loss">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Risk Rules */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-3">Risk Management</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Max Loss Per Trade (%)</label>
          <input
            type="number"
            step="0.1"
            value={riskRules}
            onChange={(e) => setRiskRules(e.target.value)}
            placeholder="e.g., 2"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}
