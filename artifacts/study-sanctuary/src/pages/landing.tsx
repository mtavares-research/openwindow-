import { useLocation } from "wouter";
import { BookOpen, Clock, Archive, Brain, Gift, Music } from "lucide-react";
import { audioSystem } from "@/lib/audio";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12 gap-12">
      {/* Hero */}
      <div className="text-center max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="logo" className="w-14 h-14" />
          <h1
            className="text-5xl font-bold text-white tracking-tight"
            style={{ textShadow: "0 0 40px hsla(190,100%,70%,0.6)" }}
          >
            Study Sanctuary
          </h1>
        </div>
        <p className="text-cyan-300/70 text-lg leading-relaxed">
          A futuristic study space. Earn trading cards for every hour you study.
          AI-powered flashcards & quizzes. Underwater ambience included.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
        {[
          { icon: Clock, label: "Study Timer" },
          { icon: Gift, label: "Card Pack Rewards" },
          { icon: Brain, label: "AI Flashcards & Quizzes" },
          { icon: Archive, label: "Card Collection" },
          { icon: Music, label: "Frutiger Aero Music" },
          { icon: BookOpen, label: "Progress Tracking" },
        ].map((f) => (
          <div key={f.label} className="glass flex items-center gap-2 px-4 py-2 rounded-full text-sm text-cyan-200">
            <f.icon size={14} className="text-cyan-400" />
            {f.label}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
        <button
          onClick={() => { audioSystem.playClick(); setLocation("/sign-up"); }}
          className="glass-button flex-1 py-4 rounded-2xl text-white font-bold text-lg hover:scale-105 transition-all"
          style={{ boxShadow: "0 0 30px hsla(190,90%,50%,0.4)" }}
        >
          Get Started
        </button>
        <button
          onClick={() => { audioSystem.playClick(); setLocation("/sign-in"); }}
          className="glass flex-1 py-4 rounded-2xl text-cyan-200 font-semibold text-lg hover:scale-105 transition-all"
        >
          Sign In
        </button>
      </div>

      {/* Preview cards */}
      <div className="grid grid-cols-3 gap-3 max-w-xs opacity-60">
        {[
          { color: "hsla(45,90%,50%,0.3)", label: "Legendary", border: "hsla(45,90%,60%,0.5)" },
          { color: "hsla(280,80%,60%,0.3)", label: "Holographic", border: "hsla(280,90%,70%,0.5)" },
          { color: "hsla(210,90%,60%,0.2)", label: "Rare", border: "hsla(210,90%,70%,0.4)" },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl aspect-[3/4] flex items-end justify-center pb-2 text-xs font-semibold"
            style={{ background: c.color, border: `1px solid ${c.border}` }}
          >
            <span className="text-white/70">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
