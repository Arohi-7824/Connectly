type PollOption = { id: number; text: string; votes: number; isMine?: boolean };
type Props = {
  question: string;
  options: PollOption[];
  isOwn: boolean;
  onVote: (optionId: number) => void;
};

export function PollMessage({ question, options, isOwn, onVote }: Props) {
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  return (
    <div className={`flex mb-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] w-full rounded-2xl border p-4 ${
        isOwn ? "bg-cyan/10 border-cyan/30" : "bg-card border-border"
      }`}>
        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">📊 {question}</p>
        <div className="space-y-2">
          {options.map(o => {
            const pct = totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0;
            return (
              <button
                key={o.id}
                onClick={() => onVote(o.id)}
                className={`w-full text-left relative rounded-lg overflow-hidden border transition-colors
                  ${o.isMine ? "border-cyan/50" : "border-border hover:border-cyan/30"}`}
              >
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${o.isMine ? "bg-cyan/25" : "bg-white/5"}`}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    {o.isMine && <span className="text-cyan">✓</span>}
                    {o.text}
                  </span>
                  <span className="text-muted text-xs shrink-0 ml-2">{o.votes} · {pct}%</span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted mt-2">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
