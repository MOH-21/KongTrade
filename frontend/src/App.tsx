import { Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import TradeDetailPage from "./pages/TradeDetailPage";
import JournalPage from "./pages/JournalPage";
import JournalEntryPage from "./pages/JournalEntryPage";
import ReportsPage from "./pages/ReportsPage";
import PlaybooksPage from "./pages/PlaybooksPage";
import PlaybookDetailPage from "./pages/PlaybookDetailPage";
import PlaybookBuilderPage from "./pages/PlaybookBuilderPage";
import SettingsPage from "./pages/SettingsPage";
import BrokerSettingsPage from "./pages/BrokerSettingsPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trades" element={<TradesPage />} />
        <Route path="/trades/:id" element={<TradeDetailPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/journal/:date" element={<JournalEntryPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/playbooks" element={<PlaybooksPage />} />
        <Route path="/playbooks/:id" element={<PlaybookDetailPage />} />
        <Route path="/playbooks/:id/builder" element={<PlaybookBuilderPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/brokers" element={<BrokerSettingsPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Routes>
    </AppShell>
  );
}
