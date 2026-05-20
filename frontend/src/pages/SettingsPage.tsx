import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Settings</h2>
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <p className="text-sm font-medium">Account</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Display Name</p>
          <p className="text-sm text-muted-foreground">{user?.display_name}</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm font-medium">Broker Connections</p>
        <p className="text-sm text-muted-foreground mt-1">Connect your trading accounts</p>
        <Link to="/settings/brokers" className="inline-block mt-3 text-sm font-medium text-primary hover:underline">
          Manage brokers →
        </Link>
      </div>
    </div>
  );
}
