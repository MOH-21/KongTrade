// ---- Enums ----
export type AssetType = "stock" | "option" | "crypto" | "futures" | "forex";
export type TradeSide = "buy" | "sell";
export type TradeStatus = "open" | "closed";
export type TradeRating = "A+" | "A" | "B" | "C" | "D" | "F";
export type EmotionalState = "confident" | "fearful" | "impulsive" | "neutral" | "greedy" | "revenge" | "disciplined";
export type TagCategory = "setup" | "mistake" | "emotion" | "strategy" | "custom";

// ---- Auth ----
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
}

// ---- Broker ----
export interface BrokerConnection {
  id: string;
  broker_name: string;
  username: string;
  is_connected: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface BrokerStatusResponse {
  connected: boolean;
  broker_name: string | null;
  last_synced_at: string | null;
  accounts: Account[];
}

export interface BrokerConnectRequest {
  broker_name: string;
  username: string;
  password: string;
  mfa_secret?: string;
}

export interface Account {
  id: string;
  account_number: string;
  account_type: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
}

// ---- Trades ----
export interface Trade {
  id: string;
  symbol: string;
  asset_type: AssetType;
  side: TradeSide;
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  entry_time: string;
  exit_time: string | null;
  pnl: number | null;
  pnl_percent: number | null;
  fees: number;
  commission: number;
  status: TradeStatus;
  rating: TradeRating | null;
  notes: string | null;
  tags_data: Record<string, string[]> | null;
  strategy_id: string | null;
  created_at: string;
}

export interface TradeCreateRequest {
  symbol: string;
  asset_type: AssetType;
  side: TradeSide;
  quantity: number;
  entry_price: number;
  exit_price?: number;
  entry_time: string;
  exit_time?: string;
  fees?: number;
  commission?: number;
  notes?: string;
  tag_ids?: string[];
  strategy_id?: string;
}

export interface TradeUpdateRequest {
  rating?: TradeRating;
  notes?: string;
  tag_ids?: string[];
  strategy_id?: string;
}

export interface TradeListParams {
  page?: number;
  page_size?: number;
  symbol?: string;
  asset_type?: AssetType;
  side?: TradeSide;
  status?: TradeStatus;
  tag_id?: string;
  strategy_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ---- Dashboard ----
export interface DashboardSummary {
  net_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  best_day: { date: string; pnl: number } | null;
  worst_day: { date: string; pnl: number } | null;
  expectancy: number;
  total_fees: number;
}

export interface CalendarDay {
  date: string;
  pnl: number;
  trade_count: number;
  is_win: boolean | null;
}

export interface ZellaScore {
  score: number;
  win_rate_score: number;
  profit_factor_score: number;
  consistency_score: number;
  risk_score: number;
  quality_score: number;
}

export interface StreakData {
  current_win_streak: number;
  current_loss_streak: number;
  longest_win_streak: number;
  longest_loss_streak: number;
  current_day_win_streak: number;
}

export interface DrawdownData {
  max_drawdown: number;
  max_drawdown_percent: number;
  max_drawdown_date: string | null;
  avg_drawdown: number;
  avg_drawdown_percent: number;
}

// ---- Journal ----
export interface JournalEntry {
  id: string;
  entry_date: string;
  pre_market_notes: string | null;
  end_of_day_notes: string | null;
  emotional_state: EmotionalState | null;
  lessons_learned: string | null;
  trade_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface JournalEntryRequest {
  pre_market_notes?: string;
  end_of_day_notes?: string;
  emotional_state?: EmotionalState;
  lessons_learned?: string;
  trade_ids?: string[];
}

// ---- Tags ----
export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
  color: string;
}

export interface TagCreateRequest {
  name: string;
  category: TagCategory;
  color?: string;
}

// ---- Playbooks ----
export interface Playbook {
  id: string;
  name: string;
  description: string | null;
  asset_types: string[] | null;
  timeframes: string[] | null;
  entry_criteria: Record<string, unknown> | null;
  exit_criteria: Record<string, unknown> | null;
  risk_rules: Record<string, unknown> | null;
  is_template: boolean;
  is_public: boolean;
  success_rate: number;
  total_trades: number;
  created_at: string;
}

export interface PlaybookCreateRequest {
  name: string;
  description?: string;
  asset_types?: string[];
  timeframes?: string[];
  entry_criteria?: Record<string, unknown>;
  exit_criteria?: Record<string, unknown>;
  risk_rules?: Record<string, unknown>;
}

// ---- Reports ----
export interface PnLTimeSeries {
  date: string;
  pnl: number;
  cumulative_pnl: number;
  trade_count: number;
}

export interface SymbolPerformance {
  symbol: string;
  pnl: number;
  trade_count: number;
  win_rate: number;
  profit_factor: number;
}

export interface TagPerformance {
  tag_id: string;
  tag_name: string;
  pnl: number;
  trade_count: number;
  win_rate: number;
}

export interface TimePerformance {
  period: string;
  pnl: number;
  trade_count: number;
  win_rate: number;
}

export interface PerformanceMetrics {
  profit_factor: number;
  expectancy: number;
  sharpe_ratio: number | null;
  avg_r_multiple: number | null;
  avg_hold_time_hours: number | null;
}
