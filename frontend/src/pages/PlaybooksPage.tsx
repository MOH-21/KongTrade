import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, BookOpen, Trash2, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { playbooksApi } from "@/api/endpoints";

export default function PlaybooksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: playbooks, isLoading } = useQuery({
    queryKey: ["playbooks"],
    queryFn: playbooksApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: playbooksApi.delete,
    onSuccess: () => {
      toast.success("Playbook deleted");
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Playbooks</h2>
          <p className="text-sm text-muted-foreground">Define and track your trading strategies</p>
        </div>
        <button
          onClick={() => navigate("/playbooks/new/builder")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Playbook
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : playbooks && playbooks.length > 0 ? (
        <div className="grid gap-3">
          {playbooks.map((pb) => (
            <div
              key={pb.id}
              className="flex items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/20 cursor-pointer transition-colors"
              onClick={() => navigate(`/playbooks/${pb.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{pb.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pb.total_trades} trades · {pb.asset_types?.join(", ") || "Any asset"} · {pb.timeframes?.join(", ") || "Any timeframe"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gain">{pb.success_rate.toFixed(0)}% success</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this playbook?")) deleteMutation.mutate(pb.id);
                  }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-loss"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Playbooks Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create playbooks to define your entry/exit criteria and track how well you follow your strategies.
          </p>
          <button
            onClick={() => navigate("/playbooks/new/builder")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Your First Playbook
          </button>
        </div>
      )}
    </div>
  );
}
