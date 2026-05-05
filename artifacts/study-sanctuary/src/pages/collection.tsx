import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Layers, Star, Zap, Droplets } from "lucide-react";
import { audioSystem } from "@/lib/audio";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CardData {
  id: number; name: string; rarity: string; type: string;
  description: string; imageUrl: string; element: string | null;
  power: number | null; flavorText: string | null;
}

interface CollectedCard {
  id: number; cardId: number; packOpeningId: number; acquiredAt: string; card: CardData;
}

interface GroupedCard {
  cardId: number; quantity: number; firstAcquired: string; card: CardData;
}

const RARITY_ORDER: Record<string, number> = { legendary: 0, holographic: 1, rare: 2, common: 3 };

function rarityClass(r: string) {
  if (r === "legendary") return "card-legendary";
  if (r === "holographic") return "card-holographic";
  if (r === "rare") return "card-rare";
  return "card-common";
}
function rarityColor(r: string) {
  if (r === "legendary") return "text-amber-600";
  if (r === "holographic") return "text-violet-600";
  if (r === "rare") return "text-sky-600";
  return "text-slate-500";
}

export default function CollectionPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<GroupedCard | null>(null);

  const { data: raw, isLoading } = useQuery<CollectedCard[]>({
    queryKey: ["collection"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/collection`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const collection: GroupedCard[] = Object.values(
    (raw ?? []).reduce<Record<number, GroupedCard>>((acc, c) => {
      if (!acc[c.cardId]) acc[c.cardId] = { cardId: c.cardId, quantity: 0, firstAcquired: c.acquiredAt, card: c.card };
      acc[c.cardId].quantity++;
      return acc;
    }, {})
  );

  const filtered = collection
    .filter(c => filter === "all" || c.card.rarity === filter)
    .filter(c => c.card.name.toLowerCase().includes(search.toLowerCase()) || c.card.type.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => RARITY_ORDER[a.card.rarity] - RARITY_ORDER[b.card.rarity]);

  const counts = {
    total: collection.length,
    legendary: collection.filter(c => c.card.rarity === "legendary").length,
    holographic: collection.filter(c => c.card.rarity === "holographic").length,
    rare: collection.filter(c => c.card.rarity === "rare").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-sky-900 mb-1">Card Collection</h1>
        <p className="text-teal-600/70 text-sm">Earn cards by studying. Every hour unlocks a pack.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Unique", value: counts.total, icon: Layers, color: "text-teal-500" },
          { label: "Legendary", value: counts.legendary, icon: Star, color: "text-amber-500" },
          { label: "Holo", value: counts.holographic, icon: Zap, color: "text-violet-500" },
          { label: "Rare", value: counts.rare, icon: Droplets, color: "text-sky-500" },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-3 text-center">
            <s.icon size={16} className={`mx-auto mb-1 ${s.color}`} />
            <div className="text-xl font-bold text-sky-900">{s.value}</div>
            <div className="text-[10px] text-teal-600/60">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="glass flex items-center gap-2 px-4 py-2 rounded-full flex-1 min-w-[180px]">
          <Search size={16} className="text-teal-500/70" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search cards…"
            className="bg-transparent text-foreground placeholder:text-foreground/40 outline-none text-sm flex-1"
          />
        </div>
        {["all", "legendary", "holographic", "rare", "common"].map(r => (
          <button key={r} onClick={() => { audioSystem.playClick(); setFilter(r); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${filter === r ? "glass-button" : "glass text-teal-700/70 hover:text-sky-900"}`}>
            {r}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="text-6xl mb-4">🎴</div>
          <div className="text-sky-900 font-semibold text-xl mb-2">
            {collection.length === 0 ? "No cards yet!" : "No cards match"}
          </div>
          <div className="text-teal-600/70 text-sm">
            {collection.length === 0 ? "Study for 1 hour to earn your first card pack" : "Try a different filter"}
          </div>
        </div>
      )}

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="glass rounded-2xl aspect-[3/4] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(c => (
            <div key={c.cardId}
              className={`glass ${rarityClass(c.card.rarity)} rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group`}
              onClick={() => { audioSystem.playClick(); setSelected(c); }}>
              <div className="p-3">
                <img src={c.card.imageUrl} alt={c.card.name}
                  className="w-full aspect-square rounded-xl mb-2 object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${rarityColor(c.card.rarity)}`}>{c.card.rarity}</div>
                <div className="text-sky-900 font-semibold text-sm leading-tight">{c.card.name}</div>
                <div className="text-teal-600/60 text-[10px] mt-0.5 capitalize">{c.card.type}</div>
                {c.quantity > 1 && <span className="mt-1.5 inline-block bg-teal-100/60 rounded-full px-2 py-0.5 text-[10px] text-teal-700">×{c.quantity}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-sky-900/40 px-4 py-5 backdrop-blur-lg"
          onClick={() => { audioSystem.playClick(); setSelected(null); }}
        >
          <div
            className="glass flex max-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white/90 shadow-xl"
            style={{ background: "rgba(248, 253, 255, 0.94)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className={`rounded-2xl overflow-hidden mb-4 ${rarityClass(selected.card.rarity)}`}>
                <img src={selected.card.imageUrl} alt={selected.card.name} className="w-full max-h-[42dvh] aspect-square object-cover" />
              </div>
              <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${rarityColor(selected.card.rarity)}`}>
                {selected.card.rarity} · {selected.card.type}
              </div>
              <h2 className="text-2xl font-bold text-sky-900 mb-2">{selected.card.name}</h2>
              <p className="text-foreground/60 text-sm mb-3">{selected.card.description}</p>
              {selected.card.power !== null && (
                <div className="glass rounded-xl px-3 py-2 mb-2 flex justify-between items-center">
                  <span className="text-teal-600/70 text-sm">Power</span>
                  <span className="text-sky-900 font-bold">{selected.card.power}</span>
                </div>
              )}
              {selected.card.element && (
                <div className="glass rounded-xl px-3 py-2 mb-3 flex justify-between items-center">
                  <span className="text-teal-600/70 text-sm">Element</span>
                  <span className={`font-semibold capitalize ${rarityColor(selected.card.rarity)}`}>{selected.card.element}</span>
                </div>
              )}
              {selected.card.flavorText && (
                <p className="text-xs italic text-foreground/45 text-center mb-3">"{selected.card.flavorText}"</p>
              )}
              <div className="text-center text-xs text-foreground/40 mb-3">x{selected.quantity} owned</div>
            </div>
            <div className="relative z-10 border-t border-white/70 bg-white/80 p-4">
              <button
                onClick={() => { audioSystem.playClick(); setSelected(null); }}
                className="glass-button w-full py-2.5 rounded-full font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
