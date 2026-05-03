import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, RotateCcw, Gift, Zap } from "lucide-react";
import { audioSystem } from "@/lib/audio";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PACK_THRESHOLD = 3600;

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface PackStatus {
  available: boolean;
  studySecondsRequired: number;
  currentStudySeconds: number;
  packsAvailable: number;
}

interface CardData {
  id: number;
  name: string;
  rarity: string;
  type: string;
  description: string;
  imageUrl: string;
  element: string | null;
  power: number | null;
  flavorText: string | null;
}

interface PackOpenResult {
  packId: number;
  cards: { id: number; cardId: number; packOpeningId: number; acquiredAt: string; card: CardData }[];
}

export default function TimerPage() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [packResult, setPackResult] = useState<PackOpenResult | null>(null);
  const [showPackReveal, setShowPackReveal] = useState(false);
  const [revealedIndex, setRevealedIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const qc = useQueryClient();

  const { data: packStatus } = useQuery<PackStatus>({
    queryKey: ["packStatus"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/packs/status`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: isRunning ? 15000 : 30000,
  });

  const startSession = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/api/study-sessions/start`, { method: "POST" });
      if (!r.ok) throw new Error("Failed to start session");
      return r.json() as Promise<{ id: number; startedAt: string }>;
    },
  });

  const stopSession = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/study-sessions/${id}/stop`, { method: "PATCH" });
      if (!r.ok) throw new Error("Failed to stop session");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packStatus"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const openPack = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/api/packs/open`, { method: "POST" });
      if (!r.ok) throw new Error("Failed to open pack");
      return r.json() as Promise<PackOpenResult>;
    },
    onSuccess: (data) => {
      setPackResult(data);
      setRevealedIndex(0);
      setShowPackReveal(true);
      audioSystem.playSuccess();
      qc.invalidateQueries({ queryKey: ["packStatus"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
    },
  });

  const startTimer = useCallback(async () => {
    audioSystem.playClick();
    startTimeRef.current = Date.now() - elapsed * 1000;
    setIsRunning(true);
    const session = await startSession.mutateAsync();
    setSessionId(session.id);
  }, [elapsed]);

  const pauseTimer = useCallback(async () => {
    audioSystem.playClick();
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sessionId) {
      await stopSession.mutateAsync(sessionId);
      setSessionId(null);
    }
  }, [sessionId]);

  const resetTimer = useCallback(async () => {
    audioSystem.playClick();
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sessionId) {
      await stopSession.mutateAsync(sessionId);
      setSessionId(null);
    }
    setElapsed(0);
  }, [sessionId]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const radius = 120;
  const circumference = 2 * Math.PI * radius;

  const totalStudied = (packStatus?.currentStudySeconds ?? 0) + (isRunning ? elapsed : 0);
  const nextPackIn = packStatus ? Math.max(0, PACK_THRESHOLD - (totalStudied % PACK_THRESHOLD)) : PACK_THRESHOLD;
  const ringProgress = packStatus ? Math.min((PACK_THRESHOLD - nextPackIn) / PACK_THRESHOLD, 1) : 0;
  const ringOffset = circumference * (1 - ringProgress);
  const packs = packStatus?.packsAvailable ?? 0;

  function rarityClass(r: string) {
    if (r === "legendary") return "card-legendary";
    if (r === "holographic") return "card-holographic";
    if (r === "rare") return "card-rare";
    return "card-common";
  }
  function rarityColor(r: string) {
    if (r === "legendary") return "text-yellow-300";
    if (r === "holographic") return "text-purple-300";
    if (r === "rare") return "text-blue-300";
    return "text-cyan-200";
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-96px)] px-4 gap-8">
      {/* Pack available banner */}
      {packs > 0 && !showPackReveal && (
        <div
          className="glass border border-yellow-400/50 rounded-2xl px-6 py-3 flex items-center gap-3 shadow-lg"
          style={{ boxShadow: "0 0 30px hsla(45,90%,50%,0.25)", animation: "legendaryGlow 2s infinite alternate" }}
        >
          <Gift size={20} className="text-yellow-300" />
          <span className="text-yellow-200 font-semibold">{packs} card pack{packs > 1 ? "s" : ""} ready!</span>
          <button
            onClick={() => openPack.mutate()}
            disabled={openPack.isPending}
            className="glass-button px-4 py-1 rounded-full text-sm font-bold text-yellow-100 ml-2"
          >
            Open!
          </button>
        </div>
      )}

      {/* Timer ring */}
      <div className="relative flex items-center justify-center">
        <svg width={300} height={300} className="drop-shadow-xl">
          <circle cx={150} cy={150} r={radius} fill="none" stroke="hsla(190,80%,50%,0.10)" strokeWidth={16} />
          {/* Glow layer */}
          <circle
            cx={150} cy={150} r={radius}
            fill="none"
            stroke="hsla(190,90%,60%,0.20)"
            strokeWidth={26}
            strokeDasharray={circumference}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center", filter: "blur(8px)", transition: "stroke-dashoffset 1s linear" }}
          />
          {/* Main ring */}
          <circle
            cx={150} cy={150} r={radius}
            fill="none"
            stroke="url(#timerGrad)"
            strokeWidth={16}
            strokeDasharray={circumference}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1s linear" }}
          />
          <defs>
            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(190,100%,70%)" />
              <stop offset="50%" stopColor="hsl(220,100%,75%)" />
              <stop offset="100%" stopColor="hsl(160,100%,65%)" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div
            className="text-5xl font-bold font-mono tracking-tight text-white"
            style={{ textShadow: "0 0 24px hsla(190,100%,70%,0.7)" }}
          >
            {formatTime(elapsed)}
          </div>
          <div className="text-xs text-cyan-300/60 font-medium">
            {nextPackIn > 0 ? `Pack in ${formatTime(nextPackIn)}` : "Pack ready!"}
          </div>
          {isRunning && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        <button
          onClick={resetTimer}
          className="glass p-3 rounded-full text-cyan-300/70 hover:text-white hover:scale-110 transition-all"
        >
          <RotateCcw size={20} />
        </button>

        <button
          onClick={isRunning ? pauseTimer : startTimer}
          disabled={startSession.isPending || stopSession.isPending}
          className="glass-button px-12 py-4 rounded-full flex items-center gap-3 text-lg font-semibold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
          style={isRunning ? { boxShadow: "0 0 40px hsla(190,90%,50%,0.5)" } : undefined}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} />}
          {isRunning ? "Pause" : "Study"}
        </button>

        <button className="glass p-3 rounded-full text-cyan-300/30 cursor-default">
          <Zap size={20} />
        </button>
      </div>

      {/* Quick stats */}
      <div className="flex gap-3 flex-wrap justify-center">
        {[
          { label: "Total Studied", value: formatTime(totalStudied) },
          { label: "Packs Available", value: packs > 0 ? `🎴 ${packs}` : "—" },
          { label: "Progress", value: `${(ringProgress * 100).toFixed(0)}%` },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl px-5 py-3 text-center min-w-[100px]">
            <div className="text-[10px] text-cyan-400/60 mb-1 uppercase tracking-wider">{s.label}</div>
            <div className="text-lg font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pack Reveal Modal */}
      {showPackReveal && packResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
          <div className="glass rounded-3xl p-8 max-w-sm w-full mx-4 text-center flex flex-col items-center gap-5">
            <div className="text-2xl font-bold text-white" style={{ textShadow: "0 0 20px hsla(45,100%,60%,0.5)" }}>
              🎴 Card Pack!
            </div>
            <div className="text-sm text-cyan-300/60">You earned this by studying</div>

            <div className="w-full flex flex-col gap-3">
              {packResult.cards.map((c, i) => i <= revealedIndex && (
                <div
                  key={c.id}
                  className={`rounded-2xl p-4 glass ${rarityClass(c.card.rarity)} ${i === revealedIndex ? "animate-in zoom-in-90 fade-in duration-300" : "opacity-60 scale-95"} transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <img src={c.card.imageUrl} alt={c.card.name} className="w-14 h-14 rounded-xl flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-bold text-white">{c.card.name}</div>
                      <div className={`text-xs font-semibold uppercase tracking-wider ${rarityColor(c.card.rarity)}`}>
                        {c.card.rarity} · {c.card.type}
                      </div>
                      <div className="text-xs text-cyan-200/60 mt-0.5 line-clamp-1">{c.card.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="glass-button px-8 py-3 rounded-full font-semibold text-white w-full"
              onClick={() => {
                if (revealedIndex < packResult.cards.length - 1) {
                  setRevealedIndex(i => i + 1);
                  audioSystem.playClick();
                } else {
                  setShowPackReveal(false);
                  setPackResult(null);
                }
              }}
            >
              {revealedIndex < packResult.cards.length - 1 ? "Next Card →" : "Done!"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
