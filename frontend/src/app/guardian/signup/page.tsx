"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setAuthToken } from "../../../lib/api";

const GUARDIAN_ACCESS_CODE = process.env.NEXT_PUBLIC_GUARDIAN_CODE || "GUARDIAN2026";

export default function GuardianSignupPage() {
  const [step, setStep] = useState<"signup" | "link">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [childEmail, setChildEmail] = useState("");
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkedChild, setLinkedChild] = useState<any>(null);
  const router = useRouter();

  async function handleSignup() {
    if (!name || !email || !password) return setError("Please fill in all fields");
    if (accessCode !== GUARDIAN_ACCESS_CODE) {
      return setError("Invalid access code. Email parents@connectly.app to get one.");
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/api/auth/register", {
        name, email, password, role: "parent",
      });
      // Log in immediately after signup
      const loginRes = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("token", loginRes.data.token);
      localStorage.setItem("userId", String(loginRes.data.user.id));
      localStorage.setItem("userName", loginRes.data.user.name);
      localStorage.setItem("role", loginRes.data.user.role);
      setAuthToken(loginRes.data.token);
      setStep("link");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkChild() {
    if (!childEmail) return setLinkError("Please enter your child's email");
    setLoading(true);
    setLinkError("");
    try {
      const { data } = await api.post("/api/guardian/link", { childEmail });
      setLinkedChild(data.child);
    } catch (err: any) {
      setLinkError(err?.response?.data?.error || "Could not link account");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — Link child's account
  if (step === "link") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-cyan flex items-center justify-center text-background font-bold">C</div>
            <span className="font-semibold text-xl">Connectly</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-8">

            {linkedChild ? (
              // Success state
              <div className="text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-bold mb-2">Account linked!</h2>
                <p className="text-muted text-sm mb-6">
                  You are now monitoring{" "}
                  <span className="text-white font-medium">{linkedChild.name}</span>&apos;s
                  account. You will receive alerts if any concerning activity is detected.
                </p>
                <div className="bg-card border border-border rounded-xl p-4 mb-6 text-left space-y-2">
                  <p className="text-xs text-muted">What happens next:</p>
                  <p className="text-xs text-white">• Their conversations are now monitored silently</p>
                  <p className="text-xs text-white">• You will get alerts for high-risk messages only</p>
                  <p className="text-xs text-white">• Normal conversations remain completely private</p>
                  <p className="text-xs text-white">• You will never see everyday messages</p>
                </div>
                <button
                  onClick={() => router.push("/parent-dashboard")}
                  className="w-full bg-gradient-to-r from-cyan to-purple text-background font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Go to dashboard →
                </button>
                <button
                  onClick={() => { setLinkedChild(null); setChildEmail(""); }}
                  className="w-full mt-3 text-muted text-sm hover:text-white transition-colors"
                >
                  Link another child
                </button>
              </div>
            ) : (
              // Link form
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-cyan flex items-center justify-center text-background text-xs font-bold">2</div>
                  <span className="text-xs text-muted">Step 2 of 2</span>
                </div>
                <h2 className="text-2xl font-bold mb-1 mt-2">Link your child&apos;s account</h2>
                <p className="text-muted text-sm mb-6">
                  Enter the email address your child used to sign up on Connectly.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Child&apos;s Email Address
                    </label>
                    <input
                      type="email"
                      value={childEmail}
                      onChange={(e) => setChildEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLinkChild()}
                      placeholder="child@example.com"
                      className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors"
                    />
                    <p className="text-muted text-xs mt-1">
                      This must match exactly the email they used to sign up
                    </p>
                  </div>

                  {linkError && (
                    <p className="text-danger text-sm bg-danger/10 border border-danger/20 px-3 py-2 rounded-lg">
                      {linkError}
                    </p>
                  )}

                  <button
                    onClick={handleLinkChild}
                    disabled={loading}
                    className="w-full bg-cyan text-background font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? "Linking..." : "Link account"}
                  </button>

                  <button
                    onClick={() => router.push("/parent-dashboard")}
                    className="w-full text-muted text-sm hover:text-white transition-colors py-2"
                  >
                    Skip for now — I&apos;ll do this later
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 1 — Guardian signup
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-cyan flex items-center justify-center text-background font-bold">C</div>
          <span className="font-semibold text-xl">Connectly</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-purple/20 border border-purple/30 text-purple-400 px-2 py-0.5 rounded-full">Guardian Portal</span>
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-6 h-6 rounded-full bg-cyan flex items-center justify-center text-background text-xs font-bold">1</div>
              <span className="text-xs text-muted">Step 1 of 2</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1 mt-3">Create guardian account</h1>
          <p className="text-muted text-sm mb-6">
            Set up monitoring for your child&apos;s Connectly account
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Your Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Your Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Guardian Access Code</label>
              <input type="text" value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Contact us to get this"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 font-mono tracking-widest transition-colors" />
              <p className="text-muted text-xs mt-1">
                Email <span className="text-cyan">parents@connectly.app</span> to receive your access code
              </p>
            </div>

            {error && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button onClick={handleSignup} disabled={loading}
              className="w-full bg-gradient-to-r from-cyan to-purple text-background font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "Creating account..." : "Continue →"}
            </button>
          </div>

          <p className="text-muted text-sm text-center mt-6">
            Already have an account?{" "}
            <Link href="/guardian/login" className="text-cyan hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}