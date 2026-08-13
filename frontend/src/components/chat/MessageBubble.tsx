import { useState } from "react";

type Reaction = { emoji: string; user_id: number };

type Props = {
  content: string;
  isOwn: boolean;
  timestamp: string;
  senderName?: string;
  showSenderName?: boolean;
  reactions?: Reaction[];
  currentUserId?: number;
  onReact?: (emoji: string) => void;
  themeClass?: string;
};

const REACTION_EMOJIS = ["💀", "🫡", "🔥", "💅", "🫶", "😭"];

export function MessageBubble({ content, isOwn, timestamp, reactions = [], currentUserId, onReact, themeClass, senderName, showSenderName }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  // Aggregate reactions into emoji -> count, and track if the current user reacted with it
  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  reactions.forEach(r => {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    if (r.user_id === currentUserId) mine.add(r.emoji);
  });

  return (
    <div className={`group flex items-end gap-2 mb-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[65%] flex flex-col gap-0.5 relative ${isOwn ? "items-end" : "items-start"}`}>
        {showSenderName && senderName && (
          <span className="text-[10px] text-cyan font-medium px-1">{senderName}</span>
        )}
        <div className="relative">
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
            isOwn
              ? `${themeClass || "bg-cyan/20 border-cyan/30"} border text-white rounded-br-sm`
              : "bg-card border border-border text-white rounded-bl-sm"
          }`}>
            {content}
          </div>

          {onReact && (
            <button
              onClick={() => setShowPicker(v => !v)}
              className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? "-left-7" : "-right-7"}
                opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-card`}
              title="React"
            >
              🙂
            </button>
          )}

          {showPicker && onReact && (
            <div className={`absolute ${isOwn ? "right-0" : "left-0"} bottom-full mb-1 bg-surface border border-border rounded-xl px-1.5 py-1 flex gap-0.5 shadow-lg z-10`}>
              {REACTION_EMOJIS.map(e => (
                <button key={e}
                  onClick={() => { onReact(e); setShowPicker(false); }}
                  className="text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-card hover:scale-110 transition-transform">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {Object.keys(counts).length > 0 && (
          <div className={`flex gap-1 flex-wrap ${isOwn ? "justify-end" : "justify-start"}`}>
            {Object.entries(counts).map(([emoji, count]) => (
              <button key={emoji}
                onClick={() => onReact?.(emoji)}
                className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors
                  ${mine.has(emoji) ? "bg-cyan/20 border-cyan/40" : "bg-card border-border hover:border-cyan/30"}`}>
                <span>{emoji}</span>
                <span className="text-muted">{count}</span>
              </button>
            ))}
          </div>
        )}

        <span className="text-[10px] text-muted px-1">{timestamp}</span>
      </div>
    </div>
  );
}
