import { Link, useLocation } from "wouter";
import { Clock, Archive, Library, BarChart2, LogOut, User } from "lucide-react";
import { audioSystem } from "@/lib/audio";
import { useClerk, useUser } from "@clerk/react";
import { useState } from "react";

export function NavigationDock() {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { href: "/timer", label: "Timer", icon: Clock },
    { href: "/collection", label: "Collection", icon: Archive },
    { href: "/study-tools", label: "Tools", icon: Library },
    { href: "/stats", label: "Stats", icon: BarChart2 },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
      <div className="glass rounded-full px-4 py-3 flex items-center gap-4">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 hover:-translate-y-2 group ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => audioSystem.playClick()}
              >
                <div className={`p-3 rounded-full transition-all duration-300 ${isActive ? "glass-button" : "hover:glass"}`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* User avatar & sign-out */}
      {user && (
        <div className="relative">
          <button
            className="glass rounded-full p-3 flex items-center gap-2 hover:scale-105 transition-all"
            onClick={() => setShowUserMenu((v) => !v)}
          >
            {user.imageUrl ? (
              <img src={user.imageUrl} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <User size={20} className="text-cyan-300" />
            )}
          </button>
          {showUserMenu && (
            <div className="absolute bottom-14 right-0 glass rounded-2xl p-3 min-w-[180px] flex flex-col gap-2 shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-150">
              <div className="px-2 py-1">
                <div className="text-xs text-cyan-400/60">Signed in as</div>
                <div className="text-sm font-medium text-white truncate max-w-[150px]">
                  {user.primaryEmailAddress?.emailAddress ?? user.username ?? "User"}
                </div>
              </div>
              <div className="h-px bg-cyan-400/10" />
              <button
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-sm text-red-400/80 hover:text-red-300 hover:glass transition-all"
                onClick={() => { setShowUserMenu(false); signOut(); }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
