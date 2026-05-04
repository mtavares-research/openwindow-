import { useLocation } from "wouter";
import { BookOpen, Clock, Archive, Brain, Gift, Music } from "lucide-react";
import { audioSystem } from "@/lib/audio";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12 gap-10">
      {/* Hero */}
      <div className="text-center max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="logo" className="w-14 h-14" />
          <h1 className="text-5xl font-bold text-sky-900 tracking-tight" style={{ textShadow: "0 2px 8px rgba(0,150,180,0.18)" }}>
            Study Sanctuary
          </h1>
        </div>
        <p className="text-teal-700/80 text-lg leading-relaxed">
          A futuristic study space. Earn trading cards for every hour you study.
          AI-powered flashcards & quizzes. Frutiger Aero vibes included.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
        {[
          { icon: Clock, label: "Study Timer" },
          { icon: Gift, label: "Card Pack Rewards" },
          { icon: Brain, label: "AI Flashcards & Quizzes" },
          { icon: Archive, label: "Card Collection" },
          { icon: Music, label: "Music Player" },
          { icon: BookOpen, label: "Progress Tracking" },
        ].map((f) => (
          <div key={f.label} className="glass flex items-center gap-2 px-4 py-2 rounded-full text-sm text-teal-700 font-medium">
            <f.icon size={14} className="text-teal-500" />
            {f.label}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
        <button
          onClick={() => { audioSystem.playClick(); setLocation("/sign-up"); }}
          className="glass-button flex-1 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all"
        >
          Get Started
        </button>
        <button
          onClick={() => { audioSystem.playClick(); setLocation("/sign-in"); }}
          className="glass flex-1 py-4 rounded-2xl text-teal-700 font-semibold text-lg hover:scale-105 transition-all"
        >
          Sign In
        </button>
      </div>

      {/* Preview cards */}
      <div className="grid grid-cols-3 gap-3 max-w-xs opacity-70">
        {[
          { color: "rgba(220,170,20,0.25)", border: "rgba(220,170,20,0.50)", label: "Legendary" },
          { color: "rgba(150,80,220,0.20)", border: "rgba(150,80,220,0.45)", label: "Holographic" },
          { color: "rgba(30,120,200,0.18)", border: "rgba(30,120,200,0.40)", label: "Rare" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl aspect-[3/4] flex items-end justify-center pb-2 text-xs font-semibold"
            style={{ background: c.color, border: `1px solid ${c.border}` }}>
            <span className="text-sky-900/60">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
