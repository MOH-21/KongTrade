import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit3, BookOpen, Target, TrendingUp, Shield } from "lucide-react";
import { playbooksApi } from "@/api/endpoints";

export default function PlaybookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: playbook, isLoading } = useQuery({
    queryKey: ["playbook", id],
    queryFn: () => playbooksApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!playbook) {
    return <div className="text-center py-20"><p className="text-muted-foreground">Playbook not found</p></div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/playbooks")} className="rounded-lg p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold">{playbook.name}</h2>
            {playbook.description && <p className="text-sm text-muted-foreground">{playbook.description}</p>}
          </div>
        </div>
        <button
          onClick={() => navigate(`/playbooks/${id}/builder`)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-gain">{playbook.success_rate.toFixed(0)}%</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
          <p className="text-2xl font-bold">{playbook.total_trades}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Asset Types</p>
          <p className="text-lg font-bold">{playbook.asset_types?.join(", ") || "Any"}</p>
        </div>
      </div>

      {/* Entry Criteria */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-gain" />
          <h3 className="text-sm font-semibold">Entry Criteria</h3>
        </div>
        {playbook.entry_criteria ? (
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/20 rounded-lg p-4">
            {JSON.stringify(playbook.entry_criteria, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">No entry criteria defined</p>
        )}
      </div>

      {/* Exit Criteria */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Exit Criteria</h3>
        </div>
        {playbook.exit_criteria ? (
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/20 rounded-lg p-4">
            {JSON.stringify(playbook.exit_criteria, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">No exit criteria defined</p>
        )}
      </div>

      {/* Risk Rules */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-yellow-500" />
          <h3 className="text-sm font-semibold">Risk Rules</h3>
        </div>
        {playbook.risk_rules ? (
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/20 rounded-lg p-4">
            {JSON.stringify(playbook.risk_rules, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">No risk rules defined</p>
        )}
      </div>
    </div>
  );
}
