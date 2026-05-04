import { ReactNode, useEffect, useState } from "react";
import { NavigationDock } from "./NavigationDock";
import { AudioController } from "./AudioController";
import { MusicPlayer } from "./MusicPlayer";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [bubbles, setBubbles] = useState<Array<{ id: number; left: number; size: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    const newBubbles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 40 + 10,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 10,
    }));
    setBubbles(newBubbles);
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary/30">
      {/* Fixed background layer — clipped to viewport, non-interactive */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="caustics" />

        {bubbles.map((b) => (
          <div
            key={b.id}
            className="bubble"
            style={{
              left: `${b.left}vw`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}

        <div className="fish fish-right" style={{ top: "20vh", width: "80px", height: "40px" }}>
          <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 25 C 20 10, 80 10, 90 25 C 80 40, 20 40, 10 25 Z" fill="rgba(100,200,255,0.4)" />
            <path d="M10 25 L 0 15 L 0 35 Z" fill="rgba(100,200,255,0.4)" />
          </svg>
        </div>
        <div className="fish fish-left" style={{ top: "55vh", width: "60px", height: "30px" }}>
          <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M90 25 C 80 10, 20 10, 10 25 C 20 40, 80 40, 90 25 Z" fill="rgba(100,255,200,0.4)" />
            <path d="M90 25 L 100 15 L 100 35 Z" fill="rgba(100,255,200,0.4)" />
          </svg>
        </div>
        <div className="fish fish-right" style={{ top: "80vh", width: "40px", height: "20px", animationDuration: "30s", animationDelay: "5s" }}>
          <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 25 C 20 10, 80 10, 90 25 C 80 40, 20 40, 10 25 Z" fill="rgba(150,220,255,0.3)" />
            <path d="M10 25 L 0 15 L 0 35 Z" fill="rgba(150,220,255,0.3)" />
          </svg>
        </div>
      </div>

      {/* Scrollable content */}
      <main className="relative z-10 min-h-[100dvh] pb-28">
        {children}
      </main>

      <NavigationDock />
      <AudioController />
      <MusicPlayer />
    </div>
  );
}
