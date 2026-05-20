import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListOrdered,
  BookOpen,
  BarChart3,
  Library,
  Settings,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trades", label: "Trades", icon: ListOrdered },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/playbooks", label: "Playbooks", icon: Library },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="flex w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <TrendingUp className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">KongTrade</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive || (to === "/dashboard" && location.pathname === "/")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      {user && (
        <div className="border-t px-4 py-3">
          <p className="text-xs font-medium truncate">{user.display_name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      )}
    </aside>
  );
}
