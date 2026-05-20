import apiClient from "./client";
import type {
  BrokerConnectRequest, BrokerConnection, BrokerStatusResponse,
  Trade, TradeCreateRequest, TradeUpdateRequest, TradeListParams, PaginatedResponse,
  DashboardSummary, CalendarDay, ZellaScore, StreakData, DrawdownData,
  JournalEntry, JournalEntryRequest,
  Tag, TagCreateRequest,
  Playbook, PlaybookCreateRequest,
  PnLTimeSeries, SymbolPerformance, TagPerformance, TimePerformance, PerformanceMetrics,
} from "@/types";

// ---- Brokers ----
export const brokersApi = {
  connect: (data: BrokerConnectRequest) => apiClient.post<BrokerConnection>("/brokers/connect", data).then(r => r.data),
  status: () => apiClient.get<BrokerStatusResponse>("/brokers/status").then(r => r.data),
  sync: () => apiClient.post<{ message: string; task_id: string }>("/brokers/sync").then(r => r.data),
  disconnect: (broker_name?: string) => apiClient.delete("/brokers/disconnect", { params: { broker_name } }).then(r => r.data),
};

// ---- Trades ----
export const tradesApi = {
  list: (params?: TradeListParams) => apiClient.get<PaginatedResponse<Trade>>("/trades", { params }).then(r => r.data),
  get: (id: string) => apiClient.get<Trade>(`/trades/${id}`).then(r => r.data),
  create: (data: TradeCreateRequest) => apiClient.post<Trade>("/trades", data).then(r => r.data),
  update: (id: string, data: TradeUpdateRequest) => apiClient.put<Trade>(`/trades/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/trades/${id}`),
  importCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<{ message: string; count: number }>("/trades/import-csv", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data);
  },
};

// ---- Dashboard ----
export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummary>("/dashboard/summary").then(r => r.data),
  calendar: (month?: number, year?: number) => apiClient.get<CalendarDay[]>("/dashboard/calendar", { params: { month, year } }).then(r => r.data),
  zellaScore: () => apiClient.get<ZellaScore>("/dashboard/zella-score").then(r => r.data),
  streaks: () => apiClient.get<StreakData>("/dashboard/streaks").then(r => r.data),
  drawdown: () => apiClient.get<DrawdownData>("/dashboard/drawdown").then(r => r.data),
  recentTrades: () => apiClient.get<Trade[]>("/dashboard/recent-trades").then(r => r.data),
};

// ---- Reports ----
export const reportsApi = {
  pnlOverTime: (start?: string, end?: string) => apiClient.get<PnLTimeSeries[]>("/reports/pnl-over-time", { params: { start_date: start, end_date: end } }).then(r => r.data),
  bySymbol: () => apiClient.get<SymbolPerformance[]>("/reports/by-symbol").then(r => r.data),
  byTag: () => apiClient.get<TagPerformance[]>("/reports/by-tag").then(r => r.data),
  byTime: () => apiClient.get<TimePerformance[]>("/reports/by-time").then(r => r.data),
  performance: () => apiClient.get<PerformanceMetrics>("/reports/performance").then(r => r.data),
};

// ---- Journal ----
export const journalApi = {
  get: (date: string) => apiClient.get<JournalEntry>(`/journal/${date}`).then(r => r.data),
  upsert: (date: string, data: JournalEntryRequest) => apiClient.post<JournalEntry>(`/journal/${date}`, data).then(r => r.data),
  heatmap: () => apiClient.get<{ date: string; has_entry: boolean; emotional_state: string | null }[]>("/journal/heatmap").then(r => r.data),
};

// ---- Tags ----
export const tagsApi = {
  list: () => apiClient.get<Tag[]>("/tags").then(r => r.data),
  create: (data: TagCreateRequest) => apiClient.post<Tag>("/tags", data).then(r => r.data),
  update: (id: string, data: Partial<TagCreateRequest>) => apiClient.put<Tag>(`/tags/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/tags/${id}`),
};

// ---- Playbooks ----
export const playbooksApi = {
  list: () => apiClient.get<Playbook[]>("/playbooks").then(r => r.data),
  get: (id: string) => apiClient.get<Playbook>(`/playbooks/${id}`).then(r => r.data),
  create: (data: PlaybookCreateRequest) => apiClient.post<Playbook>("/playbooks", data).then(r => r.data),
  update: (id: string, data: Partial<PlaybookCreateRequest>) => apiClient.put<Playbook>(`/playbooks/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/playbooks/${id}`),
  templates: () => apiClient.get<Playbook[]>("/playbooks/templates").then(r => r.data),
};
