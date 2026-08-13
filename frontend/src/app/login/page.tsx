"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setAuthToken } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) return setError("Please fill in all fields");
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", String(data.user.id));
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("role", data.user.role);
      setAuthToken(data.token);
      router.push(data.user.role === "parent" ? "/parent-dashboard" : "/chat");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-cyan flex items-center justify-center text-background font-bold">C</div>
          <span className="font-semibold text-xl">Connectly</span>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-muted text-sm mb-6">Sign in to your account</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="••••••••"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors" />
            </div>
            {error && <p className="text-danger text-sm bg-danger/10 border border-danger/20 px-3 py-2 rounded-lg">{error}</p>}
            <button onClick={handleLogin} disabled={loading}
              className="w-full bg-cyan text-background font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
          <p className="text-muted text-sm text-center mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-cyan hover:underline">Sign up</Link>
          </p>
          <p className="text-muted text-xs text-center mt-2">
          Guardian?{" "}
          <Link href="/guardian/login" className="text-purple-400 hover:underline">Sign in here</Link>
        </p>
        </div>
      </div>
    </div>
  );
}