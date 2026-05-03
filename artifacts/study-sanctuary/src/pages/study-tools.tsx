import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Brain, CheckCircle, XCircle, ChevronRight, Loader2, RotateCcw, Trash2, Sparkles } from "lucide-react";
import { audioSystem } from "@/lib/audio";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StudyMaterial {
  id: number;
  title: string;
  content: string;
  type: string;
  hasGeneratedContent: boolean;
  flashcardCount: number;
  quizCount: number;
  createdAt: string;
}

interface Flashcard {
  id: number;
  front: string;
  back: string;
  category: string | null;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}

type View = "list" | "flashcards" | "quiz";

export default function StudyToolsPage() {
  const [view, setView] = useState<View>("list");
  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: materials, isLoading } = useQuery<StudyMaterial[]>({
    queryKey: ["study-materials"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/study-materials`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: flashcards } = useQuery<Flashcard[]>({
    queryKey: ["flashcards", activeMaterialId],
    enabled: view === "flashcards" && activeMaterialId !== null,
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/flashcards?materialId=${activeMaterialId}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: quizQuestions } = useQuery<QuizQuestion[]>({
    queryKey: ["quiz", activeMaterialId],
    enabled: view === "quiz" && activeMaterialId !== null,
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/quizzes?materialId=${activeMaterialId}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const createMaterial = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const r = await fetch(`${BASE}/api/study-materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, type: "notes" }),
      });
      if (!r.ok) throw new Error("Failed to create material");
      return r.json() as Promise<StudyMaterial>;
    },
    onSuccess: async (material) => {
      qc.invalidateQueries({ queryKey: ["study-materials"] });
      // Trigger AI generation
      await generateContent.mutateAsync(material.id);
    },
  });

  const generateContent = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/study-materials/${id}/generate`, { method: "POST" });
      if (!r.ok) throw new Error("Failed to generate content");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-materials"] });
      audioSystem.playSuccess();
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/study-materials/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-materials"] }),
  });

  async function handleFile(file: File) {
    const text = await file.text();
    await createMaterial.mutateAsync({
      title: file.name.replace(/\.[^.]+$/, ""),
      content: text,
    });
  }

  async function handleTextSubmit() {
    if (!textInput.trim()) return;
    await createMaterial.mutateAsync({
      title: textTitle.trim() || "My Notes",
      content: textInput.trim(),
    });
    setTextInput("");
    setTextTitle("");
    setShowTextInput(false);
  }

  function openFlashcards(id: number) {
    setActiveMaterialId(id);
    setCardIndex(0);
    setFlipped(false);
    setView("flashcards");
  }

  function openQuiz(id: number) {
    setActiveMaterialId(id);
    setQuizIndex(0);
    setSelected(null);
    setScore(0);
    setQuizDone(false);
    setView("quiz");
  }

  function nextCard() {
    if (!flashcards) return;
    audioSystem.playClick();
    setFlipped(false);
    setTimeout(() => setCardIndex(i => Math.min(i + 1, flashcards.length - 1)), 100);
  }
  function prevCard() {
    audioSystem.playClick();
    setFlipped(false);
    setTimeout(() => setCardIndex(i => Math.max(i - 1, 0)), 100);
  }

  function answerQuiz(idx: number) {
    if (selected !== null || !quizQuestions) return;
    setSelected(idx);
    const correct = idx === quizQuestions[quizIndex].correctIndex;
    if (correct) { audioSystem.playSuccess(); setScore(s => s + 1); }
    else audioSystem.playClick();
    setTimeout(() => {
      if (quizIndex < quizQuestions.length - 1) {
        setQuizIndex(i => i + 1);
        setSelected(null);
      } else {
        setQuizDone(true);
      }
    }, 1400);
  }

  const isUploading = createMaterial.isPending || generateContent.isPending;

  // Flashcard view
  if (view === "flashcards") {
    const card = flashcards?.[cardIndex];
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="glass p-2 rounded-full text-cyan-300">
            <RotateCcw size={18} />
          </button>
          <h1 className="text-xl font-bold text-white">Flashcards</h1>
          <div className="ml-auto text-sm text-cyan-400/60">{flashcards ? `${cardIndex + 1} / ${flashcards.length}` : "..."}</div>
        </div>

        {!flashcards ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="animate-spin text-cyan-400" size={36} />
            <p className="text-cyan-300/60">Loading flashcards...</p>
          </div>
        ) : flashcards.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-white font-medium mb-1">No flashcards yet</div>
            <div className="text-cyan-400/50 text-sm">Content generation may still be in progress</div>
          </div>
        ) : (
          <>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${((cardIndex + 1) / flashcards.length) * 100}%`, background: "linear-gradient(90deg, hsl(190,100%,50%), hsl(210,100%,60%))" }}
              />
            </div>

            {/* Flip card */}
            <div
              className="card-flip-container cursor-pointer select-none"
              style={{ height: 300 }}
              onClick={() => { setFlipped(f => !f); audioSystem.playClick(); }}
            >
              <div className={`card-flip-inner w-full ${flipped ? "flipped" : ""}`} style={{ position: "relative", height: 300 }}>
                <div className="card-flip-front glass rounded-3xl p-8 flex flex-col items-center justify-center absolute inset-0">
                  <div className="text-xs text-cyan-400/60 uppercase tracking-widest mb-4">Question</div>
                  <div className="text-white text-center text-lg font-medium leading-relaxed">{card?.front}</div>
                  {card?.category && (
                    <div className="mt-4 px-3 py-1 glass rounded-full text-xs text-cyan-300/60">{card.category}</div>
                  )}
                  <div className="text-cyan-300/30 text-xs mt-6">Tap to flip</div>
                </div>
                <div className="card-flip-back glass-button rounded-3xl p-8 flex flex-col items-center justify-center absolute inset-0">
                  <div className="text-xs text-cyan-300/60 uppercase tracking-widest mb-4">Answer</div>
                  <div className="text-white text-center text-lg font-medium leading-relaxed">{card?.back}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={prevCard} disabled={cardIndex === 0} className="glass px-7 py-3 rounded-full text-white disabled:opacity-30 font-medium">← Prev</button>
              <button onClick={nextCard} disabled={cardIndex === flashcards.length - 1} className="glass-button px-7 py-3 rounded-full text-white disabled:opacity-30 font-medium">Next →</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Quiz view
  if (view === "quiz") {
    const q = quizQuestions?.[quizIndex];
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="glass p-2 rounded-full text-cyan-300">
            <RotateCcw size={18} />
          </button>
          <h1 className="text-xl font-bold text-white">Quiz</h1>
          <div className="ml-auto text-sm text-cyan-400/60">{quizQuestions ? `${quizIndex + 1} / ${quizQuestions.length}` : "..."}</div>
        </div>

        {!quizQuestions ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="animate-spin text-cyan-400" size={36} />
            <p className="text-cyan-300/60">Loading quiz...</p>
          </div>
        ) : quizQuestions.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-white font-medium">No quiz questions yet</div>
          </div>
        ) : quizDone ? (
          <div className="glass rounded-3xl p-10 text-center flex flex-col items-center gap-4">
            <div className="text-6xl">{score === quizQuestions.length ? "🏆" : score > quizQuestions.length / 2 ? "⭐" : "📚"}</div>
            <div className="text-2xl font-bold text-white">Quiz Complete!</div>
            <div className="text-cyan-300">{score} / {quizQuestions.length} correct</div>
            <div className="text-sm text-cyan-400/60">{score === quizQuestions.length ? "Perfect score!" : "Keep studying!"}</div>
            <button onClick={() => { setQuizIndex(0); setSelected(null); setScore(0); setQuizDone(false); }} className="glass-button px-8 py-3 rounded-full text-white font-semibold w-full">
              Retake Quiz
            </button>
            <button onClick={() => setView("list")} className="glass px-8 py-2 rounded-full text-cyan-300 font-medium w-full">Back</button>
          </div>
        ) : (
          <>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(quizIndex / quizQuestions.length) * 100}%`, background: "linear-gradient(90deg, hsl(280,100%,60%), hsl(190,100%,50%))" }}
              />
            </div>
            <div className="glass rounded-3xl p-6">
              <div className="text-xs text-cyan-400/60 uppercase tracking-wider mb-2">Question {quizIndex + 1}</div>
              <div className="text-white text-lg font-medium leading-relaxed">{q?.question}</div>
            </div>
            <div className="flex flex-col gap-3">
              {q?.options.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrect = i === q.correctIndex;
                let cls = "rounded-2xl p-4 text-left w-full transition-all text-sm font-medium ";
                if (selected !== null) {
                  if (isCorrect) cls += "glass border border-green-400/50 text-green-200 bg-green-500/10";
                  else if (isSelected) cls += "glass border border-red-400/50 text-red-200 bg-red-500/10";
                  else cls += "glass opacity-40 text-cyan-300/60";
                } else {
                  cls += "glass hover:glass-button text-cyan-100 cursor-pointer";
                }
                return (
                  <button key={i} className={cls} onClick={() => answerQuiz(i)} disabled={selected !== null}>
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center glass text-xs font-bold flex-shrink-0">
                        {selected !== null
                          ? isCorrect ? <CheckCircle size={14} className="text-green-400" />
                          : isSelected ? <XCircle size={14} className="text-red-400" />
                          : String.fromCharCode(65 + i)
                          : String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {selected !== null && q?.explanation && (
              <div className="glass rounded-2xl p-4 border border-cyan-400/20 text-sm text-cyan-200/80 animate-in fade-in slide-in-from-bottom-2 duration-300">
                💡 {q.explanation}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1" style={{ textShadow: "0 0 20px hsla(190,100%,70%,0.4)" }}>
          Study Tools
        </h1>
        <p className="text-cyan-300/60 text-sm">Upload or paste notes and get AI-generated flashcards & quizzes.</p>
      </div>

      {/* Upload zone */}
      <div className="flex gap-3 mb-4">
        <div
          className={`glass rounded-3xl p-6 flex flex-col items-center gap-3 cursor-pointer border-2 border-dashed transition-all flex-1 ${dragOver ? "border-cyan-400/60 bg-cyan-400/10" : "border-cyan-400/20 hover:border-cyan-400/40"} ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          {isUploading ? <Loader2 size={28} className="animate-spin text-cyan-400" /> : <Upload size={28} className="text-cyan-400/70" />}
          <div className="text-center">
            <div className="text-white font-medium text-sm">{isUploading ? "Generating AI content..." : "Drop a file"}</div>
            <div className="text-cyan-400/50 text-xs mt-0.5">TXT or Markdown</div>
          </div>
        </div>

        <button
          onClick={() => setShowTextInput(t => !t)}
          className={`glass rounded-3xl p-6 flex flex-col items-center gap-3 cursor-pointer border-2 border-dashed transition-all w-32 ${showTextInput ? "border-cyan-400/60 bg-cyan-400/10" : "border-cyan-400/20 hover:border-cyan-400/40"}`}
        >
          <FileText size={28} className="text-cyan-400/70" />
          <div className="text-white font-medium text-sm text-center">Paste text</div>
        </button>
      </div>

      {/* Text input */}
      {showTextInput && (
        <div className="glass rounded-3xl p-5 mb-4 flex flex-col gap-3 animate-in slide-in-from-top-2 fade-in duration-200">
          <input
            value={textTitle}
            onChange={e => setTextTitle(e.target.value)}
            placeholder="Title (optional)"
            className="bg-white/5 rounded-xl px-4 py-2 text-white placeholder:text-cyan-400/40 outline-none text-sm border border-cyan-400/20 focus:border-cyan-400/50"
          />
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="Paste your study notes here... AI will generate flashcards and quiz questions."
            rows={6}
            className="bg-white/5 rounded-xl px-4 py-3 text-white placeholder:text-cyan-400/40 outline-none text-sm resize-none border border-cyan-400/20 focus:border-cyan-400/50"
          />
          <div className="flex gap-3">
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isUploading}
              className="glass-button flex-1 py-2.5 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Sparkles size={16} /> Generate with AI
            </button>
            <button onClick={() => setShowTextInput(false)} className="glass px-4 py-2.5 rounded-xl text-cyan-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Materials */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyan-400" size={28} /></div>
      ) : materials?.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <Brain size={40} className="mx-auto text-cyan-400/30 mb-3" />
          <div className="text-white font-medium mb-1">No study materials yet</div>
          <div className="text-cyan-400/50 text-sm">Upload a file or paste your notes above</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {materials?.map(m => (
            <div key={m.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-lg">{m.title}</div>
                  <div className="text-cyan-400/60 text-sm mt-0.5 line-clamp-2">{m.content.slice(0, 120)}{m.content.length > 120 ? "..." : ""}</div>
                </div>
                <button
                  onClick={() => deleteMaterial.mutate(m.id)}
                  className="glass p-2 rounded-full text-red-400/50 hover:text-red-300 ml-3 flex-shrink-0 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex gap-2 text-xs text-cyan-400/60 mb-4 flex-wrap">
                <span className="glass px-2 py-1 rounded-full">{m.flashcardCount} flashcards</span>
                <span className="glass px-2 py-1 rounded-full">{m.quizCount} quiz questions</span>
                {!m.hasGeneratedContent && (
                  <span className="glass px-2 py-1 rounded-full text-yellow-300 flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> generating...
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => openFlashcards(m.id)}
                  disabled={m.flashcardCount === 0}
                  className="flex-1 glass-button py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Brain size={16} /> Flashcards
                </button>
                <button
                  onClick={() => openQuiz(m.id)}
                  disabled={m.quizCount === 0}
                  className="flex-1 glass-button py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <ChevronRight size={16} /> Quiz
                </button>
                {m.hasGeneratedContent && (
                  <button
                    onClick={() => generateContent.mutate(m.id)}
                    disabled={generateContent.isPending}
                    className="glass p-2.5 rounded-xl text-cyan-300/60 hover:text-cyan-200"
                    title="Regenerate content"
                  >
                    <Sparkles size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
