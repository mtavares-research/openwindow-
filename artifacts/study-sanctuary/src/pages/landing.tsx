import { useLocation } from "wouter";
import { BookOpen, Clock, Archive, Brain, Gift, Music } from "lucide-react";
import { audioSystem } from "@/lib/audio";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 pb-36 pt-16 gap-8 sm:gap-10">
      {/* Hero */}
      <div className="text-center max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="logo" className="w-14 h-14" />
          <h1 className="text-4xl font-bold text-sky-900 tracking-tight sm:text-5xl" style={{ textShadow: "0 2px 8px rgba(0,150,180,0.18)" }}>
            OpenWindow!
          </h1>
        </div>
        <p className="text-teal-700/80 text-lg leading-relaxed">
          A glossy study space with focus timers, card rewards, flashcards, quizzes, and soft Frutiger Aero calm.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
        {[
          { icon: Clock, label: "Study Timer" },
          { icon: Gift, label: "Card Pack Rewards" },
          { icon: Brain, label: "Flashcards & Quizzes" },
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
          onClick={() => { audioSystem.playClick(); setLocation("/timer"); }}
          className="glass-button flex-1 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all"
        >
          Get Started
        </button>
        <button
          onClick={() => { audioSystem.playClick(); setLocation("/profile"); }}
          className="glass flex-1 py-4 rounded-2xl text-teal-700 font-semibold text-lg hover:scale-105 transition-all"
        >
          Profile
        </button>
      </div>
    </div>
  );
}
