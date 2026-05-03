import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Layers, Star, Zap, Droplets } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

interface CollectedCard {
  id: number;
  cardId: number;
  packOpeningId: number;
  acquiredAt: string;
  card: CardData;
}

interface GroupedCard {
  cardId: number;
  quantity: number;
  firstAcquired: string;
  card: CardData;
}

const RARITY_ORDER: Record<string, number> = { legendary: 0, holographic: 1, rare: 2, common: 3 };

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

  // Group by cardId, count quantity
  const collection: GroupedCard[] = Object.values(
    (raw ?? []).reduce<Record<number, GroupedCard>>((acc, c) => {
      if (!acc[c.cardId]) {
        acc[c.cardId] = { cardId: c.cardId, quantity: 0, firstAcquired: c.acquiredAt, card: c.card };
      }
      acc[c.cardId].quantity++;
      return acc;
    }, {})
  );

  const filtered = collection
    .filter(c => filter === "all" || c.card.rarity === filter)
    .filter(c =>
      c.card.name.toLowerCase().includes(search.toLowerCase()) ||
      c.card.type.toLowerCase().includes(search.toLowerCase())
    )
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
        <h1 className="text-3xl font-bold text-white mb-1" style={{ textShadow: "0 0 20px hsla(190,100%,70%,0.4)" }}>
          Card Collection
        </h1>
        <p className="text-cyan-300/60 text-sm">Earn cards by studying. Every hour unlocks a pack.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Unique", value: counts.total, icon: Layers, color: "text-cyan-300" },
          { label: "Legendary", value: counts.legendary, icon: Star, color: "text-yellow-300" },
          { label: "Holo", value: counts.holographic, icon: Zap, color: "text-purple-300" },
          { label: "Rare", value: counts.rare, icon: Droplets, color: "text-blue-300" },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-3 text-center">
            <s.icon size={16} className={`mx-auto mb-1 ${s.color}`} />
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-[10px] text-cyan-400/60">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="glass flex items-center gap-2 px-4 py-2 rounded-full flex-1 min-w-[180px]">
          <Search size={16} className="text-cyan-400/60" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="bg-transparent text-white placeholder:text-cyan-400/40 outline-none text-sm flex-1"
          />
        </div>
        {["all", "legendary", "holographic", "rare", "common"].map(r => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${filter === r ? "glass-button text-white" : "glass text-cyan-300/60 hover:text-white"}`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="text-6xl mb-4">🎴</div>
          <div className="text-white font-semibold text-xl mb-2">
            {collection.length === 0 ? "No cards yet!" : "No cards match"}
          </div>
          <div className="text-cyan-300/60 text-sm">
            {collection.length === 0 ? "Study for 1 hour to earn your first card pack" : "Try a different filter"}
          </div>
        </div>
      )}

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(c => (
            <div
              key={c.cardId}
              className={`glass ${rarityClass(c.card.rarity)} rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group`}
              onClick={() => setSelected(c)}
            >
              <div className="p-3">
                <img
                  src={c.card.imageUrl}
                  alt={c.card.name}
                  className="w-full aspect-square rounded-xl mb-2 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${rarityColor(c.card.rarity)}`}>
                  {c.card.rarity}
                </div>
                <div className="text-white font-semibold text-sm leading-tight">{c.card.name}</div>
                <div className="text-cyan-300/50 text-[10px] mt-0.5 capitalize">{c.card.type}</div>
                {c.quantity > 1 && (
                  <span className="mt-1.5 inline-block bg-white/10 rounded-full px-2 py-0.5 text-[10px] text-cyan-200">
                    ×{c.quantity}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg" onClick={() => setSelected(null)}>
          <div className="glass rounded-3xl p-6 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className={`rounded-2xl overflow-hidden mb-4 ${rarityClass(selected.card.rarity)}`}>
              <img src={selected.card.imageUrl} alt={selected.card.name} className="w-full aspect-square object-cover" />
            </div>
            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${rarityColor(selected.card.rarity)}`}>
              {selected.card.rarity} · {selected.card.type}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{selected.card.name}</h2>
            <p className="text-cyan-200/70 text-sm mb-3">{selected.card.description}</p>
            {selected.card.power !== null && (
              <div className="glass rounded-xl px-3 py-2 mb-2 flex justify-between items-center">
                <span className="text-cyan-400/60 text-sm">Power</span>
                <span className="text-white font-bold">{selected.card.power}</span>
              </div>
            )}
            {selected.card.element && (
              <div className="glass rounded-xl px-3 py-2 mb-3 flex justify-between items-center">
                <span className="text-cyan-400/60 text-sm">Element</span>
                <span className={`font-semibold capitalize ${rarityColor(selected.card.rarity)}`}>{selected.card.element}</span>
              </div>
            )}
            {selected.card.flavorText && (
              <p className="text-xs italic text-cyan-300/50 text-center mb-3">"{selected.card.flavorText}"</p>
            )}
            <div className="text-center text-xs text-cyan-400/40 mb-3">×{selected.quantity} owned</div>
            <button onClick={() => setSelected(null)} className="glass-button w-full py-2.5 rounded-full text-white font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
