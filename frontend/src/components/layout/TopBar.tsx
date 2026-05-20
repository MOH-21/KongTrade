import { useLocation } from "react-router-dom";
import { RefreshCw, Moon, Sun } from "lucide-react";
import { useState } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/trades": "Trade Log",
  "/journal": "Journal",
  "/reports": "Reports",
  "/playbooks": "Playbooks",
  "/settings": "Settings",
};

export default function TopBar() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const basePath = "/" + location.pathname.split("/")[1];
  const title = PAGE_TITLES[basePath] || "KongTrade";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="text-sm font-semibold">{title}</h1>
        {location.pathname.split("/").length > 2 && (
          <p className="text-xs text-muted-foreground">{location.pathname}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
          Sync
        </button>
      </div>
    </header>
  );
}
