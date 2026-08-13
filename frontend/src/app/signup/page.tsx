"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup() {
    if (!name || !email || !password) {
      return setError("Please fill in all fields");
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/register", {
        name,
        email,
        password,
        dob: dob || undefined,
        role: "child",
      });
      router.push("/login");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong");
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
          <h1 className="text-2xl font-bold mb-1">Create account</h1>
          <p className="text-muted text-sm mb-6">Join Connectly and start chatting</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                placeholder="Create a strong password"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                placeholder="Create a strong password"
                className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors"
              />
            </div>

            {/* DOB — optional, no asterisk, no "required" label */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Date of Birth
                <span className="text-muted font-normal ml-1">(optional)</span>
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full bg-card border border-border text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 transition-colors"
              />
              <p className="text-muted text-xs mt-1">
                Helps us keep your account safe
              </p>
            </div>

            {error && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-cyan text-background font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </div>

          <p className="text-muted text-sm text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-muted text-xs text-center mt-4">
          By signing up you agree to our{" "}
          <a href="#" className="underline hover:text-white">Terms</a> and{" "}
          <a href="#" className="underline hover:text-white">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
