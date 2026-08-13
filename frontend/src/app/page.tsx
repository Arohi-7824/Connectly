import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-white">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan flex items-center justify-center text-background font-bold text-sm">C</div>
          <span className="font-semibold text-lg">Connectly</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#vibes" className="hover:text-white transition-colors">Vibes</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted hover:text-white transition-colors px-4 py-2">
            Log in
          </Link>
          <Link href="/signup" className="text-sm bg-cyan text-background font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Join free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-purple/5 pointer-events-none" />
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple/10 border border-purple/20 text-purple-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              ✨ Chat different
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              Messaging that
              <br />
              actually <span className="gradient-text">gets you.</span>
            </h1>
            <p className="text-muted text-lg leading-relaxed mb-8 max-w-md">
              Mood status. Vibe rooms. Memory capsules. Music sharing. Built for the way you actually communicate.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/signup" className="bg-cyan text-background font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity glow-cyan">
                Start chatting free
              </Link>
              <a href="#features" className="border border-border text-white px-6 py-3 rounded-lg hover:border-white/30 transition-colors">
                See what&apos;s new
              </a>
            </div>
            <p className="text-muted text-xs mt-4">No ads. No spam. Just vibes.</p>
          </div>

          {/* Chat preview */}
          <div className="relative">
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center gap-3 pb-3 border-b border-border mb-4">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold text-background text-sm">J</div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-surface" />
                </div>
                <div>
                  <p className="text-sm font-medium">Jordan</p>
                  <p className="text-xs text-purple-400">🔥 Hyped right now</p>
                </div>
                <div className="ml-auto text-xs text-muted">🎵 Sabrina Carpenter</div>
              </div>
              <div className="space-y-3 min-h-[140px]">
                <div className="flex justify-start">
                  <div className="bg-card border border-border text-white text-sm px-3 py-2 rounded-2xl rounded-tl-sm max-w-[70%]">
                    bro did you see that 💀
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-cyan/20 border border-cyan/20 text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm max-w-[70%]">
                    LMAOOO 💅 i cant
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-card border border-border text-white text-sm px-3 py-2 rounded-2xl rounded-tl-sm max-w-[70%]">
                    vibe room tonight? 🎮
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-cyan/20 border border-cyan/20 text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm max-w-[70%]">
                    say less 🔥
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <input readOnly placeholder="say something..." className="flex-1 bg-card text-sm text-muted px-3 py-2 rounded-lg border border-border outline-none" />
                <button className="w-8 h-8 bg-cyan rounded-lg flex items-center justify-center text-background">➤</button>
              </div>
            </div>

            {/* Floating mood badge */}
            <div className="absolute -top-4 -right-4 bg-surface border border-purple/30 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xl">
              <span className="text-lg">😴</span>
              <div>
                <p className="text-xs font-medium">Alex</p>
                <p className="text-xs text-muted">low energy rn</p>
              </div>
            </div>

            {/* Floating streak badge */}
            <div className="absolute -bottom-4 -left-4 bg-surface border border-cyan/30 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xl">
              <span className="text-lg">🔥</span>
              <div>
                <p className="text-xs font-medium text-cyan">14 day streak</p>
                <p className="text-xs text-muted">with Jordan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-8 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built different 🔥</h2>
            <p className="text-muted text-lg">Features that actually make sense for how you chat</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "😴", title: "Mood Status", desc: "Let people know your vibe before they message you. Low energy, hyped, busy studying — set it and forget it.", color: "border-purple/20 bg-purple/5" },
              { icon: "🔥", title: "Streaks", desc: "Keep the conversation going. Build streaks with your closest friends and see who's really got your back.", color: "border-cyan/20 bg-cyan/5" },
              { icon: "🎮", title: "Vibe Rooms", desc: "Create a temporary group for tonight's plans. Auto-deletes in 24 hours. No permanent record, just vibes.", color: "border-purple/20 bg-purple/5" },
              { icon: "🔒", title: "Memory Capsules", desc: "Send a message that locks until a specific date. Perfect for birthdays, countdowns, and surprises.", color: "border-cyan/20 bg-cyan/5" },
              { icon: "🎵", title: "Music Status", desc: "Show what you're listening to right now. Your music taste says everything about your current mood.", color: "border-purple/20 bg-purple/5" },
              { icon: "🗳️", title: "Polls", desc: "Can't decide what to do tonight? Drop a poll. Everyone votes, no more endless 'idk you decide' convos.", color: "border-cyan/20 bg-cyan/5" },
            ].map((f) => (
              <div key={f.title} className={`border ${f.color} rounded-2xl p-6 card-hover`}>
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vibe section */}
      <section id="vibes" className="py-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Your chat. Your vibe. 💅</h2>
          <p className="text-muted text-lg mb-12">Customise everything. Make it yours.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { theme: "Midnight", bg: "bg-gray-900", accent: "bg-blue-500" },
              { theme: "Sunset", bg: "bg-orange-950", accent: "bg-orange-400" },
              { theme: "Forest", bg: "bg-green-950", accent: "bg-green-400" },
              { theme: "Galaxy", bg: "bg-purple-950", accent: "bg-purple-400" },
            ].map((t) => (
              <div key={t.theme} className={`${t.bg} rounded-2xl p-4 border border-white/10 cursor-pointer hover:scale-105 transition-transform`}>
                <div className={`w-full h-2 ${t.accent} rounded-full mb-3`} />
                <div className="space-y-2">
                  <div className={`h-6 ${t.accent} rounded-lg opacity-20 w-3/4`} />
                  <div className="h-6 bg-white/10 rounded-lg w-full" />
                  <div className={`h-6 ${t.accent} rounded-lg opacity-40 w-1/2 ml-auto`} />
                </div>
                <p className="text-xs text-white/60 mt-3 text-center">{t.theme}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-8 bg-surface">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">FAQ</h2>
          <div className="space-y-4">
            {[
              { q: "Is Connectly free?", a: "Yes, completely free. No ads, no premium tiers, no catch." },
              { q: "Can I use it on my phone?", a: "Connectly works in any mobile browser right now. A native app is coming soon." },
              { q: "Who can message me?", a: "Only people you've added as contacts. No strangers can message you out of nowhere." },
              { q: "What happens to my messages?", a: "Your messages are stored securely and processed in accordance with our privacy policy. We take your privacy seriously." },
            ].map((item) => (
              <div key={item.q} className="bg-card border border-border rounded-xl p-5">
                <p className="font-medium mb-2">{item.q}</p>
                <p className="text-muted text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to chat different? 🚀</h2>
          <p className="text-muted text-lg mb-8">Join free. No credit card. No spam.</p>
          <Link href="/signup" className="inline-block bg-gradient-to-r from-cyan to-purple text-background font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg text-lg">
            Create your account →
          </Link>
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
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
            {/* Hidden parent link — not obvious but findable */}
            <Link href="/parents" className="hover:text-white transition-colors">For Parents</Link>
          </div>
          <p className="text-muted text-sm">© 2026 Connectly</p>
        </div>
      </footer>

    </div>
  );
}
