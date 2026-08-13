import Link from "next/link";

export default function ParentsPage() {
  return (
    <div className="min-h-screen bg-background text-white">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan flex items-center justify-center text-background font-bold text-sm">C</div>
          <span className="font-semibold text-lg">Connectly</span>
          <span className="ml-2 text-xs bg-purple/20 border border-purple/30 text-purple-400 px-2 py-0.5 rounded-full">For Parents</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/guardian/login" className="text-sm text-muted hover:text-white transition-colors px-4 py-2">
            Guardian login
          </Link>
          <Link href="/guardian/signup" className="text-sm bg-gradient-to-r from-cyan to-purple text-background font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Set up monitoring
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-cyan/10 border border-cyan/20 text-cyan text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            🛡️ Built for families
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Peace of mind.<br />
            <span className="gradient-text">Not surveillance.</span>
          </h1>
          <p className="text-muted text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            Connectly monitors your child&apos;s conversations for real dangers — grooming, predatory behaviour, drug solicitation — and alerts you instantly. Without reading every message.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/guardian/signup" className="bg-cyan text-background font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity glow-cyan">
              Set up for free
            </Link>
            <a href="#how-it-works" className="border border-border text-white px-6 py-3 rounded-lg hover:border-white/30 transition-colors">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Trust stats */}
      <section className="py-12 px-8 border-y border-border bg-surface">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { stat: "5 layers", label: "of AI detection" },
            { stat: "Real-time", label: "guardian alerts" },
            { stat: "0 messages", label: "read without cause" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-cyan mb-1">{s.stat}</p>
              <p className="text-muted text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The problem */}
      <section className="py-24 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">The problem with existing options</h2>
            <p className="text-muted text-lg">Every current solution has a fatal flaw</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                title: "Reading every message",
                problem: "Destroys trust. Your child finds out, stops using the app, moves somewhere you can't see at all.",
                icon: "👁️",
                color: "border-danger/20 bg-danger/5",
              },
              {
                title: "Blocking apps entirely",
                problem: "Kids find workarounds within hours. Forbidden apps become more appealing. Doesn't address the real threat.",
                icon: "🚫",
                color: "border-danger/20 bg-danger/5",
              },
              {
                title: "Trusting existing platforms",
                problem: "WhatsApp, Snapchat, Instagram have no parental monitoring. Predators know this and use it.",
                icon: "📱",
                color: "border-danger/20 bg-danger/5",
              },
            ].map((item) => (
              <div key={item.title} className={`border ${item.color} rounded-2xl p-6`}>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.problem}</p>
              </div>
            ))}
          </div>

          {/* Solution */}
          <div className="bg-gradient-to-r from-cyan/10 to-purple/10 border border-cyan/20 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-3">Connectly is different</h3>
            <p className="text-muted leading-relaxed max-w-2xl mx-auto">
              Your child uses Connectly like any messaging app — they don&apos;t know about the safety layer. 
              Our AI monitors for real threats in real time and alerts you when something needs your attention. 
              You never read normal conversations. You only hear about genuine risks.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-8 bg-surface">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted text-lg">Simple setup, powerful protection</p>
          </div>
          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "You create a guardian account",
                desc: "Sign up at this page. Takes 2 minutes. You get a unique invite code.",
                icon: "👤",
              },
              {
                step: "02",
                title: "Your child signs up with your code",
                desc: "Your child downloads Connectly and signs up normally. They enter your invite code — linking their account to yours silently.",
                icon: "🔗",
              },
              {
                step: "03",
                title: "They chat. You stay informed.",
                desc: "Your child uses Connectly like any messaging app. Our AI monitors every message invisibly. You only get alerted when something is genuinely concerning.",
                icon: "💬",
              },
              {
                step: "04",
                title: "You get an alert — not the message",
                desc: "When risk is detected you get a notification: who sent it, what category of risk, how serious. Not the full message. You decide whether to have a conversation with your child.",
                icon: "🔔",
              },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-6 bg-card border border-border rounded-2xl p-6">
                <div className="text-4xl shrink-0">{s.icon}</div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-cyan">STEP {s.step}</span>
                    <h3 className="font-semibold">{s.title}</h3>
                  </div>
                  <p className="text-muted text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we detect */}
      <section className="py-24 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Connectly detects</h2>
            <p className="text-muted text-lg">5 layers of AI working simultaneously</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Grooming patterns", desc: "Secrecy requests, isolation attempts, trust manipulation, inappropriate photo requests", icon: "🎯" },
              { title: "Drug solicitation", desc: "50+ drug slang terms, dealing patterns, 'first one's free' tactics, substance references", icon: "⚠️" },
              { title: "Coded language", desc: "Emoji codes, number codes, innocent-sounding phrases used to disguise intent", icon: "🔍" },
              { title: "Predatory behaviour", desc: "Trajectory analysis — detects grooming arcs across multiple messages not just single flags", icon: "📊" },
              { title: "Novel threats", desc: "Zero-shot AI catches new tactics that no keyword list would catch — like emotional manipulation disguised as friendship", icon: "🤖" },
              { title: "Trafficking signals", desc: "Fake modelling offers, money for photos, isolation from family — common trafficking recruitment tactics", icon: "🚨" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 bg-card border border-border rounded-xl p-5">
                <span className="text-2xl shrink-0">{item.icon}</span>
                <div>
                  <p className="font-medium text-sm mb-1">{item.title}</p>
                  <p className="text-muted text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy promise */}
      <section className="py-24 px-8 bg-surface">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our privacy promise</h2>
            <p className="text-muted text-lg">Safety without surveillance</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "You never see normal messages", desc: "Everyday conversations between your child and their friends are completely private. You only see risk alerts.", icon: "✅" },
              { title: "No risk score means no alert", desc: "The vast majority of messages never trigger an alert. You won't be spammed with notifications.", icon: "✅" },
              { title: "Alerts show category, not content", desc: "You see 'grooming pattern detected from [contact]' — not the actual message. You decide how to respond.", icon: "✅" },
              { title: "Your child trusts you more", desc: "Because you're not reading their private messages, your relationship stays intact. You're a safety net, not a spy.", icon: "✅" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 bg-card border border-border rounded-xl p-5">
                <span className="text-xl shrink-0 text-cyan">{item.icon}</span>
                <div>
                  <p className="font-medium text-sm mb-1">{item.title}</p>
                  <p className="text-muted text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Set it up in 2 minutes</h2>
          <p className="text-muted text-lg mb-8">
            Free to use. No credit card. Cancel anytime.
          </p>
          <Link href="/guardian/signup" className="inline-block bg-gradient-to-r from-cyan to-purple text-background font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg text-lg">
            Create guardian account →
          </Link>
          <p className="text-muted text-xs mt-4">
            Already have an account?{" "}
            <Link href="/guardian/login" className="text-cyan hover:underline">Sign in to dashboard</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan flex items-center justify-center text-background font-bold text-xs">C</div>
            <span className="font-semibold">Connectly</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
            <Link href="/" className="hover:text-white transition-colors">Back to main site</Link>
          </div>
          <p className="text-muted text-sm">© 2026 Connectly</p>
        </div>
      </footer>

    </div>
  );
}
