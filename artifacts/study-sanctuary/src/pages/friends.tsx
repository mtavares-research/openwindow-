import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, ChevronRight, ArrowLeft } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Profile {
  id: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarColor: string;
}

interface FriendCard {
  cardId: number;
  quantity: number;
  card: {
    id: number; name: string; rarity: string; type: string;
    description: string; imageUrl: string; element: string | null; power: number | null;
  };
}

const RARITY_COLORS: Record<string, string> = {
  legendary: "text-amber-600", holographic: "text-violet-600", rare: "text-sky-600", common: "text-slate-500",
};

export default function FriendsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const { data: results = [] } = useQuery<Profile[]>({
    queryKey: ["profile-search", debouncedQ],
    queryFn: async () => {
      if (debouncedQ.length < 2) return [];
      const r = await fetch(`${BASE}/api/profile/search?q=${encodeURIComponent(debouncedQ)}`);
      return r.json();
    },
    enabled: debouncedQ.length >= 2,
  });

  const { data: friendCards = [], isLoading: cardsLoading } = useQuery<FriendCard[]>({
    queryKey: ["friend-collection", selectedUser?.userId],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/users/${selectedUser!.userId}/collection`);
      return r.json();
    },
    enabled: !!selectedUser,
  });

  function handleSearch(v: string) {
    setQuery(v);
    clearTimeout((window as any)._searchTimeout);
    (window as any)._searchTimeout = setTimeout(() => setDebouncedQ(v), 400);
  }

  if (selectedUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        <button onClick={() => setSelectedUser(null)} className="glass px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900 self-start">
          <ArrowLeft size={14} /> Back to search
        </button>

        <div className="glass rounded-3xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow flex-shrink-0"
            style={{ background: selectedUser.avatarColor }}>
            {(selectedUser.displayName ?? selectedUser.username ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-sky-900">{selectedUser.displayName ?? "Anonymous"}</div>
            {selectedUser.username && <div className="text-sm text-teal-600 font-mono">@{selectedUser.username}</div>}
            {selectedUser.bio && <div className="text-xs text-foreground/60 mt-0.5">{selectedUser.bio}</div>}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-sky-900 mb-3">Their Collection ({friendCards.length} unique cards)</h2>
          {cardsLoading ? (
            <div className="glass rounded-2xl p-6 text-center text-foreground/50 text-sm">Loading…</div>
          ) : friendCards.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-foreground/50 text-sm">No cards yet</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {friendCards.sort((a, b) => { const o: Record<string,number> = {legendary:0,holographic:1,rare:2,common:3}; return (o[a.card.rarity]??4)-(o[b.card.rarity]??4); }).map((fc) => (
                <div key={fc.cardId} className={`glass rounded-2xl p-3 flex flex-col gap-2 ${fc.card.rarity === "legendary" ? "card-legendary" : fc.card.rarity === "holographic" ? "card-holographic" : fc.card.rarity === "rare" ? "card-rare" : "card-common"}`}>
                  <img src={fc.card.imageUrl} alt={fc.card.name} className="w-full h-20 object-cover rounded-xl" />
                  <div className="text-xs font-bold text-foreground truncate">{fc.card.name}</div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-semibold uppercase ${RARITY_COLORS[fc.card.rarity] ?? "text-slate-500"}`}>{fc.card.rarity}</span>
                    {fc.quantity > 1 && <span className="text-[10px] text-foreground/50">×{fc.quantity}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Users size={22} className="text-teal-600" />
        <h1 className="text-2xl font-bold text-sky-900">Find Friends</h1>
      </div>
      <p className="text-sm text-foreground/60">Search by username to view other players' card collections.</p>

      <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3">
        <Search size={16} className="text-teal-500 flex-shrink-0" />
        <input
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-foreground/40"
          placeholder="Search username…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {debouncedQ.length >= 2 && (
        <div className="flex flex-col gap-2">
          {results.length === 0 ? (
            <div className="glass rounded-2xl p-4 text-center text-foreground/50 text-sm">No users found</div>
          ) : (
            results.map((p) => (
              <button key={p.userId} onClick={() => setSelectedUser(p)}
                className="glass rounded-2xl p-4 flex items-center gap-3 text-left hover:scale-[1.01] transition-all group">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: p.avatarColor }}>
                  {(p.displayName ?? p.username ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sky-900 truncate">{p.displayName ?? "Anonymous"}</div>
                  {p.username && <div className="text-xs text-teal-600 font-mono">@{p.username}</div>}
                </div>
                <ChevronRight size={16} className="text-foreground/30 group-hover:text-teal-500 transition-colors" />
              </button>
            ))
          )}
        </div>
      )}

      {debouncedQ.length < 2 && debouncedQ.length > 0 && (
        <div className="text-center text-sm text-foreground/40">Type at least 2 characters to search</div>
      )}
    </div>
  );
}
