import { useEffect, useRef, useState } from "react";

type Props = {
  audioUrl: string;
  duration: number | null;
  waveform: number[] | null;
  isOwn: boolean;
  backendUrl: string;
};

export function VoiceMessage({ audioUrl, duration, waveform, isOwn, backendUrl }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1

  const bars = waveform && waveform.length > 0 ? waveform : Array.from({ length: 40 }, () => 0.3);
  const fullUrl = audioUrl.startsWith("http") ? audioUrl : `${backendUrl}${audioUrl}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  function fmtDuration(s: number | null) {
    if (!s) return "0:00";
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const activeBars = Math.round(progress * bars.length);

  return (
    <div className={`flex mb-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-center gap-3 max-w-[75%] rounded-2xl border px-4 py-3 ${
        isOwn ? "bg-cyan/20 border-cyan/30" : "bg-card border-border"
      }`}>
        <audio ref={audioRef} src={fullUrl} preload="metadata" />
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-full bg-cyan/90 flex items-center justify-center text-background font-bold shrink-0 hover:opacity-90"
        >
          {playing ? "❙❙" : "▶"}
        </button>
        <div className="flex items-end gap-[2px] h-8">
          {bars.map((v, i) => (
            <div
              key={i}
              className={`w-[3px] rounded-full transition-colors ${i < activeBars ? "bg-cyan" : "bg-white/20"}`}
              style={{ height: `${Math.max(15, v * 100)}%` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted shrink-0">{fmtDuration(duration)}</span>
      </div>
    </div>
  );
}
