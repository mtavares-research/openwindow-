import { useQuery } from "@tanstack/react-query";
import { Clock, Package, Brain, TrendingUp, Calendar, Zap, Star, BookOpen } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ApiStats {
  totalStudySeconds: number;
  sessionsCompleted: number;
  cardsCollected: number;
  packsOpened: number;
  uniqueCards: number;
  legendaryCards: number;
  flashcardsCreated: number;
  quizzesCreated: number;
}

function fmt(s: number) {
  if (s === 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery<ApiStats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/stats`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const WEEKLY_GOAL = 18000; // 5 hours
  // Use total time as a rough weekly proxy (real weekly would need date filtering)
  const weeklyProgress = stats ? Math.min((stats.totalStudySeconds / WEEKLY_GOAL) * 100, 100) : 0;

  const statCards = [
    { label: "Total Study Time", value: stats ? fmt(stats.totalStudySeconds) : "—", icon: Clock, color: "text-cyan-400", glow: "hsla(190,90%,50%,0.3)" },
    { label: "Sessions Done", value: stats?.sessionsCompleted ?? "—", icon: Calendar, color: "text-blue-400", glow: "hsla(220,90%,60%,0.3)" },
    { label: "Packs Opened", value: stats?.packsOpened ?? "—", icon: Package, color: "text-pink-400", glow: "hsla(320,90%,60%,0.3)" },
    { label: "Cards Collected", value: stats?.cardsCollected ?? "—", icon: BookOpen, color: "text-emerald-400", glow: "hsla(160,90%,50%,0.3)" },
    { label: "Unique Cards", value: stats?.uniqueCards ?? "—", icon: Zap, color: "text-yellow-400", glow: "hsla(45,90%,60%,0.3)" },
    { label: "Legendary Cards", value: stats?.legendaryCards ?? "—", icon: Star, color: "text-orange-400", glow: "hsla(25,90%,55%,0.3)" },
    { label: "Flashcard Sets", value: stats?.flashcardsCreated ?? "—", icon: Brain, color: "text-purple-400", glow: "hsla(280,90%,60%,0.3)" },
    { label: "Quiz Sets", value: stats?.quizzesCreated ?? "—", icon: TrendingUp, color: "text-red-400", glow: "hsla(0,90%,60%,0.3)" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1" style={{ textShadow: "0 0 20px hsla(190,100%,70%,0.4)" }}>
          Study Stats
        </h1>
        <p className="text-cyan-300/60 text-sm">Track your progress and see how far you've come.</p>
      </div>

      {/* Goal ring */}
      <div className="glass rounded-3xl p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-white font-semibold text-lg">Study Goal</div>
            <div className="text-cyan-400/60 text-sm">
              {stats ? `${fmt(stats.totalStudySeconds)} of ${fmt(WEEKLY_GOAL)}` : "Loading..."}
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{weeklyProgress.toFixed(0)}%</div>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${weeklyProgress}%`,
              background: "linear-gradient(90deg, hsl(190,100%,50%), hsl(210,100%,60%), hsl(160,100%,50%))",
              boxShadow: "0 0 12px hsla(190,100%,50%,0.5)",
            }}
          />
        </div>
        {stats && stats.totalStudySeconds >= WEEKLY_GOAL && (
          <div className="text-center text-sm text-yellow-300 mt-3 font-medium">
            🏆 Goal reached! Keep going!
          </div>
        )}
      </div>

      {/* Stat grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {statCards.map(s => (
            <div
              key={s.label}
              className="glass rounded-2xl p-5 flex flex-col gap-2 transition-all hover:scale-[1.02]"
              style={{ boxShadow: `0 0 20px ${s.glow}` }}
            >
              <div className="flex items-center gap-2">
                <s.icon size={16} className={s.color} />
                <div className="text-xs text-cyan-400/60">{s.label}</div>
              </div>
              <div className="text-2xl font-bold text-white leading-none">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Motivational */}
      {stats && stats.totalStudySeconds === 0 && (
        <div className="glass rounded-3xl p-8 text-center mt-6">
          <div className="text-4xl mb-3">🌊</div>
          <div className="text-white font-semibold mb-2">Ready to begin?</div>
          <div className="text-cyan-300/60 text-sm">Start your first study session on the Timer tab!</div>
        </div>
      )}
      {stats && stats.totalStudySeconds > 0 && stats.totalStudySeconds < 3600 && (
        <div className="glass rounded-3xl p-6 text-center mt-6 border border-cyan-400/20">
          <div className="text-white font-medium mb-1">🎴 Almost there!</div>
          <div className="text-cyan-300/60 text-sm">Study for {fmt(3600 - stats.totalStudySeconds)} more to earn your first card pack.</div>
        </div>
      )}
      {stats && stats.legendaryCards > 0 && (
        <div className="glass rounded-3xl p-6 text-center mt-4 border border-yellow-400/20" style={{ boxShadow: "0 0 30px hsla(45,90%,50%,0.15)" }}>
          <div className="text-yellow-300 font-semibold text-lg mb-1">⚡ Legendary Collector!</div>
          <div className="text-cyan-300/60 text-sm">You've collected {stats.legendaryCards} legendary card{stats.legendaryCards !== 1 ? "s" : ""}. Incredible!</div>
        </div>
      )}
    </div>
  );
}
