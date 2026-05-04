import { useState, useRef, useEffect, useCallback } from "react";
import { Music, Upload, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, ChevronUp, ChevronDown, List } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Track {
  id: string;
  name: string;
  url: string;
}

function formatDur(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem("ss-playlist-names");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([70]);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume[0] / 100;
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => setProgress(audio.currentTime));
    audio.addEventListener("durationchange", () => setDuration(audio.duration));
    audio.addEventListener("ended", () => playNext());

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
  }, [volume, isMuted]);

  const loadTrack = useCallback((track: Track) => {
    if (!audioRef.current) return;
    const blobUrl = blobUrlsRef.current.get(track.id) ?? track.url;
    audioRef.current.src = blobUrl;
    audioRef.current.load();
  }, []);

  useEffect(() => {
    if (currentTrack) {
      loadTrack(currentTrack);
      if (isPlaying) audioRef.current?.play().catch(() => setIsPlaying(false));
    }
  }, [currentIndex, currentTrack]);

  function playNext() {
    setCurrentIndex((i) => (i + 1) % Math.max(tracks.length, 1));
  }
  function playPrev() {
    setCurrentIndex((i) => (i - 1 + tracks.length) % Math.max(tracks.length, 1));
  }

  async function togglePlay() {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {}
    }
  }

  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("audio/"));
    if (!arr.length) return;
    const newTracks: Track[] = arr.map((f) => {
      const id = crypto.randomUUID();
      const url = URL.createObjectURL(f);
      blobUrlsRef.current.set(id, url);
      return { id, name: f.name.replace(/\.[^.]+$/, ""), url };
    });
    setTracks((prev) => {
      const updated = [...prev, ...newTracks];
      localStorage.setItem("ss-playlist-names", JSON.stringify(updated.map((t) => ({ id: t.id, name: t.name, url: "" }))));
      return updated;
    });
    if (tracks.length === 0) {
      setCurrentIndex(0);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = newTracks[0].url;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 50);
    }
  }

  function removeTrack(id: string) {
    const url = blobUrlsRef.current.get(id);
    if (url) URL.revokeObjectURL(url);
    blobUrlsRef.current.delete(id);
    setTracks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (updated.length === 0) {
        setIsPlaying(false);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      }
      return updated;
    });
    setCurrentIndex((i) => Math.max(0, i > 0 ? i - 1 : 0));
  }

  function seek(val: number[]) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = val[0];
    setProgress(val[0]);
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 flex items-end flex-col gap-2">
      {/* Main panel */}
      {isOpen && (
        <div className="glass rounded-2xl p-4 w-72 flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Music size={15} className="text-cyan-400" />
              Music Player
            </div>
            <button onClick={() => setShowPlaylist((p) => !p)} className="glass p-1.5 rounded-full text-cyan-400/70 hover:text-cyan-200">
              <List size={13} />
            </button>
          </div>

          {/* Upload area */}
          <div
            className={`rounded-xl border-2 border-dashed transition-all flex flex-col items-center gap-1.5 py-3 px-2 cursor-pointer ${dragOver ? "border-cyan-400/60 bg-cyan-400/10" : "border-cyan-400/20 hover:border-cyan-400/40"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
            <Upload size={16} className="text-cyan-400/60" />
            <span className="text-xs text-cyan-400/50 text-center">Drop audio files or click to upload</span>
          </div>

          {/* Now playing */}
          {currentTrack ? (
            <>
              <div className="text-center">
                <div className="text-white font-medium text-sm truncate px-2">{currentTrack.name}</div>
                <div className="text-cyan-400/50 text-xs mt-0.5">{currentIndex + 1} / {tracks.length}</div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan-400/50 w-8 text-right">{formatDur(progress)}</span>
                <Slider
                  value={[progress]}
                  onValueChange={seek}
                  max={duration || 1}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-[10px] text-cyan-400/50 w-8">{formatDur(duration)}</span>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button onClick={playPrev} className="text-cyan-300/70 hover:text-white transition-colors">
                  <SkipBack size={20} />
                </button>
                <button
                  onClick={togglePlay}
                  className="glass-button p-3 rounded-full text-white hover:scale-110 transition-all"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button onClick={playNext} className="text-cyan-300/70 hover:text-white transition-colors">
                  <SkipForward size={20} />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMuted((m) => !m)} className="text-cyan-400/60 hover:text-cyan-200">
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <Slider value={volume} onValueChange={setVolume} max={100} step={1} className="flex-1" />
              </div>
            </>
          ) : (
            <div className="text-center py-3 text-cyan-400/40 text-sm">No tracks yet — upload some music!</div>
          )}

          {/* Playlist */}
          {showPlaylist && tracks.length > 0 && (
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              <div className="text-[10px] text-cyan-400/50 uppercase tracking-wider mb-1">Playlist</div>
              {tracks.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-all group ${i === currentIndex ? "glass-button text-white" : "hover:glass text-cyan-200/70"}`}
                  onClick={() => { setCurrentIndex(i); setTimeout(() => audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {}), 50); }}
                >
                  {i === currentIndex && isPlaying && (
                    <div className="flex gap-[2px] items-end h-3 flex-shrink-0">
                      {[1, 2, 3].map((b) => (
                        <div key={b} className="w-[3px] bg-cyan-400 rounded-sm animate-pulse" style={{ height: `${(b * 4)}px`, animationDelay: `${b * 0.1}s` }} />
                      ))}
                    </div>
                  )}
                  <span className="text-xs truncate flex-1">{t.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTrack(t.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-300 flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`glass-button p-4 rounded-full flex items-center gap-2 shadow-lg transition-all ${isPlaying ? "text-cyan-300" : "text-white/70"}`}
        style={isPlaying ? { boxShadow: "0 0 20px hsla(190,90%,50%,0.4)" } : undefined}
      >
        <Music size={20} />
        {isPlaying && (
          <div className="flex gap-[2px] items-end h-4">
            {[1, 2, 3].map((b) => (
              <div key={b} className="w-[3px] bg-cyan-400 rounded-sm animate-pulse" style={{ height: `${b * 4 + 4}px`, animationDelay: `${b * 0.15}s` }} />
            ))}
          </div>
        )}
      </button>
    </div>
  );
}
