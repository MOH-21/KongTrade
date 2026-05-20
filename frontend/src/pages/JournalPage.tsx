import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { journalApi } from "@/api/endpoints";
import { formatCurrency, cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from "date-fns";

const EMOTION_COLORS: Record<string, string> = {
  confident: "bg-gain/20 text-gain",
  fearful: "bg-red-500/20 text-red-400",
  impulsive: "bg-orange-500/20 text-orange-400",
  neutral: "bg-muted text-muted-foreground",
  greedy: "bg-yellow-500/20 text-yellow-400",
  revenge: "bg-red-700/20 text-red-600",
  disciplined: "bg-blue-500/20 text-blue-400",
};

export default function JournalPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: heatmap, isLoading } = useQuery({
    queryKey: ["journal-heatmap", year, month],
    queryFn: () => journalApi.heatmap(),
  });

  const { data: dashboardCalendar } = useQuery({
    queryKey: ["dashboard-calendar", month, year],
    queryFn: () => import("@/api/endpoints").then(m => m.dashboardApi.calendar(month, year)),
  });

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const dayPnl: Record<string, { pnl: number; isWin: boolean | null }> = {};
  if (dashboardCalendar) {
    for (const d of dashboardCalendar) {
      dayPnl[d.date] = { pnl: d.pnl, isWin: d.is_win };
    }
  }

  const heatmapData: Record<string, { has_entry: boolean; emotional_state: string | null }> = {};
  if (heatmap) {
    for (const h of heatmap) {
      heatmapData[h.date] = { has_entry: h.has_entry, emotional_state: h.emotional_state };
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trading Journal</h2>
        <button
          onClick={() => navigate(`/journal/${format(new Date(), "yyyy-MM-dd")}`)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Today's Entry
        </button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(addDays(startOfMonth(currentMonth), -1))}
          className="rounded-lg p-2 hover:bg-accent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
        <button
          onClick={() => setCurrentMonth(addDays(endOfMonth(currentMonth), 1))}
          className="rounded-lg p-2 hover:bg-accent"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const dateStr = format(d, "yyyy-MM-dd");
            const pnlInfo = dayPnl[dateStr];
            const journalInfo = heatmapData[dateStr];
            const isToday = isSameDay(d, new Date());
            const inMonth = isSameMonth(d, currentMonth);

            return (
              <div
                key={i}
                onClick={() => navigate(`/journal/${dateStr}`)}
                className={cn(
                  "min-h-[90px] border-b border-r p-2 cursor-pointer hover:bg-muted/30 transition-colors",
                  !inMonth && "opacity-40",
                  isToday && "ring-1 ring-inset ring-primary"
                )}
              >
                <span className={cn("text-xs", isToday ? "font-bold text-primary" : "text-muted-foreground")}>
                  {format(d, "d")}
                </span>

                {journalInfo?.has_entry && (
                  <div className="mt-1">
                    <BookOpen className="h-3 w-3 text-primary" />
                  </div>
                )}

                {journalInfo?.emotional_state && (
                  <span className={cn("mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium", EMOTION_COLORS[journalInfo.emotional_state] || "")}>
                    {journalInfo.emotional_state}
                  </span>
                )}

                {pnlInfo && pnlInfo.pnl !== 0 && (
                  <p className={cn("mt-1 text-xs font-medium", pnlInfo.isWin ? "text-gain" : pnlInfo.isWin === false ? "text-loss" : "text-muted-foreground")}>
                    {formatCurrency(pnlInfo.pnl, true)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
