import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Unlink, RefreshCw, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { brokersApi } from "@/api/endpoints";
import { formatDateTime, cn } from "@/lib/utils";

export default function BrokerSettingsPage() {
  const queryClient = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);
  const [step, setStep] = useState<"creds" | "mfa">("creds");
  const [form, setForm] = useState({ username: "", password: "", mfa_code: "" });
  const [pendingConnectionId, setPendingConnectionId] = useState<string | null>(null);

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
      ...(step === "mfa" ? { mfa_code: form.mfa_code, connection_id: pendingConnectionId! } : {}),
    }),
    onSuccess: (data) => {
      if (data.mfa_required) {
        setPendingConnectionId(data.connection_id);
        setStep("mfa");
      } else {
        toast.success("Connected to Robinhood");
        queryClient.invalidateQueries({ queryKey: ["broker-status"] });
        setShowConnect(false);
        setStep("creds");
        setForm({ username: "", password: "", mfa_code: "" });
        setPendingConnectionId(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Connection failed");
      setStep("creds");
      setPendingConnectionId(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: brokersApi.sync,
    onSuccess: (data) => {
      toast.success(`Synced ${data.new_trades} trades`);
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
                onClick={() => { setShowConnect(true); setStep("creds"); }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Link2 className="h-4 w-4" />
                Connect Robinhood
              </button>
            )}
          </div>
        </div>

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

      {/* Connect Modal */}
      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">
                {step === "creds" ? "Connect Robinhood" : "Enter MFA Code"}
              </h3>
              <button onClick={() => { setShowConnect(false); setStep("creds"); }} className="rounded-lg p-1 hover:bg-accent">✕</button>
            </div>

            {step === "creds" ? (
              <div className="p-6 space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  Your credentials are encrypted at rest. We use the unofficial Robinhood API.
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
                <button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending || !form.username || !form.password}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {connectMutation.isPending ? "Connecting..." : "Connect"}
                  {!connectMutation.isPending && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-600 dark:text-yellow-400">
                  Robinhood requires additional verification. Enter the code sent to your email or authenticator app.
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Verification Code</label>
                  <input
                    type="text"
                    value={form.mfa_code}
                    onChange={(e) => setForm({ ...form, mfa_code: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="123456"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep("creds"); setPendingConnectionId(null); }}
                    className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending || !form.mfa_code}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {connectMutation.isPending ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
