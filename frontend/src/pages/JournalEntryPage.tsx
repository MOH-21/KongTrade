import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import toast from "react-hot-toast";
import { journalApi } from "@/api/endpoints";
import { formatDate } from "@/lib/utils";
import type { EmotionalState, JournalEntryRequest } from "@/types";

const EMOTIONS: { value: EmotionalState; label: string; emoji: string }[] = [
  { value: "confident", label: "Confident", emoji: "💪" },
  { value: "disciplined", label: "Disciplined", emoji: "🧘" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "fearful", label: "Fearful", emoji: "😰" },
  { value: "impulsive", label: "Impulsive", emoji: "⚡" },
  { value: "greedy", label: "Greedy", emoji: "🤑" },
  { value: "revenge", label: "Revenge", emoji: "😤" },
];

export default function JournalEntryPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [preMarketNotes, setPreMarketNotes] = useState("");
  const [endOfDayNotes, setEndOfDayNotes] = useState("");
  const [emotionalState, setEmotionalState] = useState<EmotionalState | "">("");
  const [lessonsLearned, setLessonsLearned] = useState("");

  const { data: entry, isLoading } = useQuery({
    queryKey: ["journal-entry", date],
    queryFn: () => journalApi.get(date!),
    enabled: !!date,
    retry: false,
  });

  useEffect(() => {
    if (entry) {
      setPreMarketNotes(entry.pre_market_notes || "");
      setEndOfDayNotes(entry.end_of_day_notes || "");
      setEmotionalState(entry.emotional_state || "");
      setLessonsLearned(entry.lessons_learned || "");
    }
  }, [entry]);

  const saveMutation = useMutation({
    mutationFn: (data: JournalEntryRequest) => journalApi.upsert(date!, data),
    onSuccess: () => {
      toast.success("Journal saved");
      queryClient.invalidateQueries({ queryKey: ["journal-entry", date] });
      queryClient.invalidateQueries({ queryKey: ["journal-heatmap"] });
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleSave = () => {
    saveMutation.mutate({
      pre_market_notes: preMarketNotes || undefined,
      end_of_day_notes: endOfDayNotes || undefined,
      emotional_state: (emotionalState as EmotionalState) || undefined,
      lessons_learned: lessonsLearned || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/journal")} className="rounded-lg p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">{date ? formatDate(date) : "Journal Entry"}</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Emotional State */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">How did you feel?</h3>
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => setEmotionalState(emotionalState === value ? "" : value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                emotionalState === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-Market */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-3">Pre-Market Notes</h3>
        <textarea
          value={preMarketNotes}
          onChange={(e) => setPreMarketNotes(e.target.value)}
          rows={4}
          placeholder="What's your plan for today? Key levels, news, sentiment..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* End of Day */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-3">End of Day Notes</h3>
        <textarea
          value={endOfDayNotes}
          onChange={(e) => setEndOfDayNotes(e.target.value)}
          rows={4}
          placeholder="How did the day go? What went well? What didn't?"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Lessons Learned */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-3">Lessons Learned</h3>
        <textarea
          value={lessonsLearned}
          onChange={(e) => setLessonsLearned(e.target.value)}
          rows={3}
          placeholder="What did you learn today? What will you do differently?"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
    </div>
  );
}
