"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAuthToken } from "../../lib/api";

type Alert = {
  id: number;
  category: string;
  risk_score: number;
  content: string;
  message_time: string;
  status: string;
};

export default function ParentDashboard() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role !== "parent") { router.push("/chat"); return; }
    setAuthToken(token);
    api.get("/api/parent/alerts")
      .then(({ data }) => setAlerts(data.alerts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const high = alerts.filter((a) => a.risk_score >= 0.8);

  return (
    <div className="min-h-screen bg-background text-white">
      <nav className="flex items-center justify-between px-8 py-4 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan flex items-center justify-center text-background font-bold text-sm">C</div>
          <span className="font-semibold">Connectly</span>
          <span className="ml-3 text-xs bg-purple/20 border border-purple/30 text-purple-400 px-2 py-0.5 rounded-full">Parent Dashboard</span>
        </div>
        <button onClick={() => { localStorage.clear(); router.push("/login"); }}
          className="text-sm text-muted hover:text-white transition-colors">Sign out</button>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Total Alerts", value: alerts.length, color: "text-white", bg: "bg-card border-border" },
            { label: "High Risk", value: high.length, color: "text-danger", bg: "bg-danger/5 border-danger/20" },
            { label: "Needs Review", value: alerts.filter(a => a.status === "unreviewed").length, color: "text-cyan", bg: "bg-cyan/5 border-cyan/20" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border rounded-2xl p-6`}>
              <p className="text-muted text-sm mb-1">{s.label}</p>
              <p className={`text-4xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4">Safety Alerts</h2>

        {loading && (
          <div className="text-center py-16 text-muted">
            <div className="text-3xl mb-3">⟳</div>
            <p className="text-sm">Loading alerts...</p>
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="text-center py-16 bg-surface border border-border rounded-2xl">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium mb-1">No alerts yet</p>
            <p className="text-muted text-sm">Everything looks safe. Alerts appear here when the AI detects risk.</p>
          </div>
        )}

        <div className="space-y-3">
          {alerts.map((alert) => {
            const isHigh = alert.risk_score >= 0.8;
            const isMed = alert.risk_score >= 0.5;
            return (
              <div key={alert.id} className={`border rounded-2xl p-5 ${
                isHigh ? "bg-danger/5 border-danger/20" : isMed ? "bg-yellow-500/5 border-yellow-500/20" : "bg-card border-border"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isHigh ? "bg-danger/20 text-danger" : isMed ? "bg-yellow-500/20 text-yellow-400" : "bg-cyan/20 text-cyan"}`}>
                      {isHigh ? "🚨 High Risk" : isMed ? "⚠️ Medium Risk" : "ℹ️ Low Risk"}
                    </span>
                    <span className="text-xs text-muted capitalize">{alert.category.replace(/_/g, " ")}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">{new Date(alert.message_time).toLocaleString()}</p>
                    <p className={`text-sm font-bold mt-0.5 ${isHigh ? "text-danger" : isMed ? "text-yellow-400" : "text-cyan"}`}>
                      {Math.round(alert.risk_score * 100)}% risk
                    </p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isHigh ? "bg-danger" : isMed ? "bg-yellow-400" : "bg-cyan"}`}
                    style={{ width: `${alert.risk_score * 100}%` }} />
                </div>
                <p className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-lg px-3 py-2 italic">
                  &ldquo;{alert.content}&rdquo;
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    alert.status === "unreviewed"
                      ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                      : "border-green-500/30 text-green-400 bg-green-500/10"}`}>
                    {alert.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}