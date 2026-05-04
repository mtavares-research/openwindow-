import { ReactNode } from "react";
import { NavigationDock } from "./NavigationDock";
import { AudioController } from "./AudioController";
import { MusicPlayer } from "./MusicPlayer";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] w-full text-foreground selection:bg-primary/20">
      {/* Decorative cloud layer — fixed, non-interactive */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Large background clouds */}
        <div className="cloud" style={{ width: 320, height: 90, top: "6%", left: "5%", opacity: 0.55 }} />
        <div className="cloud" style={{ width: 200, height: 60, top: "7%", left: "6%", opacity: 0.45 }} />
        <div className="cloud" style={{ width: 260, height: 75, top: "18%", right: "8%", opacity: 0.50 }} />
        <div className="cloud" style={{ width: 160, height: 50, top: "19%", right: "9%", opacity: 0.40 }} />
        <div className="cloud" style={{ width: 380, height: 100, top: "38%", left: "-2%", opacity: 0.35 }} />
        <div className="cloud" style={{ width: 220, height: 65, top: "39%", left: "-1%", opacity: 0.30 }} />
        <div className="cloud" style={{ width: 300, height: 85, bottom: "22%", right: "4%", opacity: 0.38 }} />
        <div className="cloud" style={{ width: 180, height: 55, bottom: "23%", right: "5%", opacity: 0.28 }} />

        {/* Subtle light bloom at top */}
        <div style={{
          position: "absolute",
          top: 0, left: "30%", right: "30%",
          height: 180,
          background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.55) 0%, transparent 75%)",
        }} />

        {/* Green ground hint at the very bottom */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: 100,
          background: "linear-gradient(to top, rgba(120, 195, 100, 0.18) 0%, transparent 100%)",
        }} />
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
