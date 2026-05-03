import { Link, useLocation } from "wouter";
import { Clock, Archive, Library, BarChart2 } from "lucide-react";
import { audioSystem } from "@/lib/audio";

export function NavigationDock() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Timer", icon: Clock },
    { href: "/collection", label: "Collection", icon: Archive },
    { href: "/study-tools", label: "Tools", icon: Library },
    { href: "/stats", label: "Stats", icon: BarChart2 },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass rounded-full px-6 py-3 flex items-center gap-6 z-50">
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <div 
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 hover:-translate-y-2 group ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => audioSystem.playClick()}
            >
              <div className={`p-3 rounded-full transition-all duration-300 ${isActive ? 'glass-button' : 'hover:glass'}`}>
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
