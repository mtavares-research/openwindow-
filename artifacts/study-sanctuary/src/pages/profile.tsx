import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Edit2, Save, X, Sparkles, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Profile {
  id: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarColor: string;
  createdAt: string;
}

const AVATAR_COLORS = [
  "#00bcd4","#26c6da","#4caf50","#66bb6a","#2196f3","#42a5f5",
  "#9c27b0","#ab47bc","#ff5722","#ff7043","#795548","#8d6e63",
];

export default function ProfilePage() {
  const { user } = useUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", displayName: "", bio: "", avatarColor: "#00bcd4" });

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/profile`);
      if (!r.ok) throw new Error("Failed to load profile");
      const data = await r.json();
      setForm({ username: data.username ?? "", displayName: data.displayName ?? "", bio: data.bio ?? "", avatarColor: data.avatarColor ?? "#00bcd4" });
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/api/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "Save failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); setEditing(false); toast({ title: "Profile saved!" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/api/profile/claim-all-cards`, { method: "POST" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "Failed"); }
      return r.json();
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["collection"] }); toast({ title: `🎴 ${d.message}` }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const initials = (user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "?").slice(0, 2).toUpperCase();

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass rounded-3xl p-8 text-foreground/60">Loading profile…</div></div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-sky-900">My Profile</h1>

      {/* Avatar + basic info */}
      <div className="glass rounded-3xl p-6 flex flex-col items-center gap-4">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg"
            style={{ background: `radial-gradient(circle at 35% 35%, ${lighten(form.avatarColor)}, ${form.avatarColor})`, boxShadow: `0 4px 20px ${form.avatarColor}66` }}
          >
            {user?.imageUrl ? <img src={user.imageUrl} alt="avatar" className="w-full h-full rounded-full object-cover" /> : initials}
          </div>
        </div>

        {editing ? (
          <div className="w-full flex flex-col gap-3">
            <div>
              <label className="text-xs text-sky-700 font-medium mb-1 block">Display Name</label>
              <input
                className="glass w-full px-3 py-2 rounded-xl text-sm text-foreground placeholder:text-foreground/40 outline-none focus:ring-2 focus:ring-primary/30"
                value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs text-sky-700 font-medium mb-1 block">Username</label>
              <input
                className="glass w-full px-3 py-2 rounded-xl text-sm text-foreground placeholder:text-foreground/40 outline-none focus:ring-2 focus:ring-primary/30"
                value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                placeholder="username (letters, numbers, _)"
              />
            </div>
            <div>
              <label className="text-xs text-sky-700 font-medium mb-1 block">Bio</label>
              <textarea
                className="glass w-full px-3 py-2 rounded-xl text-sm text-foreground placeholder:text-foreground/40 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Tell others about yourself…"
              />
            </div>
            <div>
              <label className="text-xs text-sky-700 font-medium mb-1 block">Avatar Color</label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button key={c} onClick={() => setForm((f) => ({ ...f, avatarColor: c }))}
                    className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                    style={{ background: c, borderColor: form.avatarColor === c ? "#1a4a5c" : "transparent" }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                className="glass-button flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold">
                <Save size={14} /> Save
              </button>
              <button onClick={() => setEditing(false)} className="glass px-4 py-2 rounded-xl text-sm font-medium text-sky-700 hover:text-sky-900">
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center w-full">
            <div className="text-xl font-bold text-sky-900">{profile?.displayName ?? "No display name"}</div>
            {profile?.username && <div className="text-sm text-teal-600 font-mono">@{profile.username}</div>}
            {profile?.bio && <div className="text-sm text-foreground/70 mt-1">{profile.bio}</div>}
            <div className="text-xs text-foreground/40 mt-1">{user?.primaryEmailAddress?.emailAddress}</div>
            <button onClick={() => setEditing(true)} className="mt-3 glass px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900 mx-auto">
              <Edit2 size={13} /> Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Demo collection */}
      <div className="glass rounded-3xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sky-800 font-semibold">
          <Sparkles size={16} className="text-amber-500" />
          Demo Collection
        </div>
        <p className="text-sm text-foreground/65">Instantly unlock all 26 cards to explore the full collection. Only adds cards once.</p>
        <button
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
          className="glass-button py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm disabled:opacity-60"
        >
          <Gift size={16} />
          {claimMutation.isPending ? "Claiming…" : "Claim All 26 Cards"}
        </button>
      </div>
    </div>
  );
}

function lighten(hex: string) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + 80);
  const g = Math.min(255, ((num >> 8) & 0xff) + 80);
  const b = Math.min(255, (num & 0xff) + 80);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}
