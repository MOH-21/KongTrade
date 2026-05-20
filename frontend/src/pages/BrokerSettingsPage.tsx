import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Unlink, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { brokersApi } from "@/api/endpoints";
import { formatDateTime, cn } from "@/lib/utils";

export default function BrokerSettingsPage() {
  const queryClient = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", mfa_secret: "" });

  const { data: status, isLoading } = useQuery({
    queryKey: ["broker-status"],
    queryFn: brokersApi.status,
    refetchInterval: 15_000,
  });

  const connectMutation = useMutation({
    mutationFn: () => brokersApi.connect({
      broker_name: "robinhood",
      username: form.username,
      password: form.password,
      mfa_secret: form.mfa_secret || undefined,
    }),
    onSuccess: () => {
      toast.success("Connected to Robinhood");
      queryClient.invalidateQueries({ queryKey: ["broker-status"] });
      setShowConnect(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Connection failed");
    },
  });

  const syncMutation = useMutation({
    mutationFn: brokersApi.sync,
    onSuccess: (data) => {
      toast.success(`Sync started — task ${data.task_id}`);
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Sync failed");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => brokersApi.disconnect("robinhood"),
    onSuccess: () => {
      toast.success("Disconnected");
      queryClient.invalidateQueries({ queryKey: ["broker-status"] });
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Broker Connections</h2>

      {/* Status Card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              status?.connected ? "bg-gain/10" : "bg-muted"
            )}>
              {status?.connected ? (
                <CheckCircle className="h-5 w-5 text-gain" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">Robinhood</p>
              <p className="text-sm text-muted-foreground">
                {status?.connected
                  ? `Connected — Last synced: ${status.last_synced_at ? formatDateTime(status.last_synced_at) : "Never"}`
                  : "Not connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <>
                <button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
                  Sync
                </button>
                <button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-loss hover:bg-loss/10 disabled:opacity-50"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowConnect(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Link2 className="h-4 w-4" />
                Connect Robinhood
              </button>
            )}
          </div>
        </div>

        {/* Accounts */}
        {status?.accounts && status.accounts.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">Linked Accounts</h4>
            {status.accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{acc.account_number}</p>
                  <p className="text-xs text-muted-foreground">{acc.account_type} · {acc.currency}</p>
                </div>
                <p className="text-sm font-medium">${acc.current_balance.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Form Modal */}
      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">Connect Robinhood</h3>
              <button onClick={() => setShowConnect(false)} className="rounded-lg p-1 hover:bg-accent">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                Your credentials are encrypted at rest. We use robin_stocks (unofficial API) for data access.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Robinhood Email</label>
                <input
                  type="email"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="you@email.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">TOTP Secret (for MFA)</label>
                <input
                  type="text"
                  value={form.mfa_secret}
                  onChange={(e) => setForm({ ...form, mfa_secret: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="From your 2FA setup"
                />
                <p className="text-xs text-muted-foreground">Get this from Robinhood 2FA setup. Used with pyotp for MFA codes.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowConnect(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</button>
                <button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending || !form.username || !form.password}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {connectMutation.isPending ? "Connecting..." : "Connect"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
