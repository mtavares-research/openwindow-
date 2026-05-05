type Profile = {
  id: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarColor: string;
  createdAt: string;
};

type CardData = {
  id: number;
  name: string;
  rarity: string;
  type: string;
  description: string;
  imageUrl: string;
  element: string | null;
  power: number | null;
  flavorText: string | null;
};

type CollectedCard = {
  id: number;
  cardId: number;
  packOpeningId: number;
  acquiredAt: string;
  card: CardData;
};

type StudyMaterial = {
  id: number;
  title: string;
  content: string;
  type: string;
  hasGeneratedContent: boolean;
  flashcardCount: number;
  quizCount: number;
  createdAt: string;
};

type Flashcard = {
  id: number;
  materialId: number;
  front: string;
  back: string;
  category: string | null;
};

type QuizQuestion = {
  id: number;
  materialId: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
};

type State = {
  profile: Profile;
  collection: CollectedCard[];
  materials: StudyMaterial[];
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
  totalStudySeconds: number;
  sessionsCompleted: number;
  packsOpened: number;
  nextSessionId: number;
  nextCollectionId: number;
  nextMaterialId: number;
};

const STORAGE_KEY = "openwindow-local-state";
const originalFetch = window.fetch.bind(window);

const cardNames = [
  ["Focus Fern", "common", "plant"],
  ["Cloud Notebook", "common", "artifact"],
  ["Mint Momentum", "common", "spell"],
  ["Blue Hour Lamp", "common", "artifact"],
  ["Quiet Current", "common", "water"],
  ["Desk Sprite", "common", "companion"],
  ["Review Ripple", "rare", "water"],
  ["Memory Prism", "rare", "crystal"],
  ["Exam Shield", "rare", "artifact"],
  ["Flow State", "rare", "spell"],
  ["Aero Bloom", "holographic", "plant"],
  ["Neon Margin", "holographic", "artifact"],
  ["Zenith Card", "legendary", "celestial"],
  ["Sanctuary Core", "legendary", "artifact"],
] as const;

const cards: CardData[] = cardNames.map(([name, rarity, type], index) => ({
  id: index + 1,
  name,
  rarity,
  type,
  description: `${name} rewards steady attention and gentle momentum.`,
  imageUrl: cardImage(name, rarity, index),
  element: rarity === "legendary" ? "light" : rarity === "holographic" ? "aero" : type,
  power: 45 + index * 7,
  flavorText: "A little progress still counts as progress.",
}));

const friendProfiles: Profile[] = [
  {
    id: 2,
    userId: "friend-river",
    username: "river_notes",
    displayName: "River",
    bio: "Collects rare review cards.",
    avatarColor: "#42a5f5",
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    userId: "friend-nova",
    username: "nova_studies",
    displayName: "Nova",
    bio: "Flashcard enthusiast.",
    avatarColor: "#ab47bc",
    createdAt: new Date().toISOString(),
  },
];

function cardImage(name: string, rarity: string, index: number) {
  const palette: Record<string, string[]> = {
    common: ["#dff8ff", "#3fb7c7"],
    rare: ["#dff0ff", "#3488df"],
    holographic: ["#f3e6ff", "#9b5de5"],
    legendary: ["#fff0bd", "#d49b12"],
  };
  const [bg, fg] = palette[rarity] ?? palette.common;
  const initials = name.split(" ").map((part) => part[0]).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
    <rect width="240" height="240" rx="36" fill="${bg}"/>
    <circle cx="${80 + (index % 3) * 22}" cy="88" r="52" fill="${fg}" opacity=".18"/>
    <circle cx="152" cy="134" r="68" fill="${fg}" opacity=".28"/>
    <path d="M64 164 C92 112 148 112 176 164" fill="none" stroke="${fg}" stroke-width="13" stroke-linecap="round"/>
    <text x="120" y="132" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="54" font-weight="700" fill="${fg}">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function defaultState(): State {
  const now = new Date().toISOString();
  return {
    profile: {
      id: 1,
      userId: "local-demo-user",
      username: "study_friend",
      displayName: "Study Friend",
      bio: "Running locally, no hosted account needed.",
      avatarColor: "#00bcd4",
      createdAt: now,
    },
    collection: cards.slice(0, 4).map((card, index) => ({
      id: index + 1,
      cardId: card.id,
      packOpeningId: 1,
      acquiredAt: now,
      card,
    })),
    materials: [
      {
        id: 1,
        title: "Sample Notes",
        content: "Active recall and spaced repetition improve long-term memory.",
        type: "notes",
        hasGeneratedContent: true,
        flashcardCount: 2,
        quizCount: 2,
        createdAt: now,
      },
    ],
    flashcards: [
      { id: 1, materialId: 1, front: "What practice strengthens long-term memory?", back: "Spaced repetition.", category: "Memory" },
      { id: 2, materialId: 1, front: "What is active recall?", back: "Testing yourself instead of rereading passively.", category: "Study Skills" },
    ],
    quizzes: [
      {
        id: 1,
        materialId: 1,
        question: "Which habit best supports durable learning?",
        options: ["Cramming once", "Spaced repetition", "Skipping review", "Only highlighting"],
        correctIndex: 1,
        explanation: "Spacing review sessions helps memory consolidate.",
      },
      {
        id: 2,
        materialId: 1,
        question: "Active recall means...",
        options: ["Testing memory", "Changing fonts", "Reading faster", "Avoiding notes"],
        correctIndex: 0,
        explanation: "Retrieving information strengthens the memory trace.",
      },
    ],
    totalStudySeconds: 2700,
    sessionsCompleted: 2,
    packsOpened: 1,
    nextSessionId: 1,
    nextCollectionId: 5,
    nextMaterialId: 2,
  };
}

function loadState(): State {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return saveState(defaultState());
  try {
    return JSON.parse(raw) as State;
  } catch {
    return saveState(defaultState());
  }
}

function saveState(state: State) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

async function body<T>(request: Request) {
  return request.json() as Promise<T>;
}

function createGeneratedContent(material: StudyMaterial, state: State) {
  const words = material.content.split(/\s+/).filter(Boolean).slice(0, 8).join(" ") || material.title;
  state.flashcards = state.flashcards.filter((card) => card.materialId !== material.id);
  state.quizzes = state.quizzes.filter((quiz) => quiz.materialId !== material.id);
  state.flashcards.push(
    { id: Date.now(), materialId: material.id, front: `What is the core idea in "${material.title}"?`, back: words, category: "Summary" },
    { id: Date.now() + 1, materialId: material.id, front: "What should you review next?", back: material.title, category: "Review" },
  );
  state.quizzes.push(
    {
      id: Date.now() + 2,
      materialId: material.id,
      question: `Which topic did you add to OpenWindow!?`,
      options: [material.title, "Ancient history", "Guitar scales", "Budget planning"],
      correctIndex: 0,
      explanation: "The local demo turns your note title into a quick quiz.",
    },
    {
      id: Date.now() + 3,
      materialId: material.id,
      question: "What is a useful next step after adding notes?",
      options: ["Ignore them", "Review generated cards", "Delete all notes", "Close the app"],
      correctIndex: 1,
      explanation: "Reviewing soon after capture reinforces the material.",
    },
  );
  material.hasGeneratedContent = true;
  material.flashcardCount = 2;
  material.quizCount = 2;
}

async function handleApi(request: Request, pathname: string) {
  const state = loadState();
  const apiPath = pathname.slice(pathname.indexOf("/api"));

  if (apiPath === "/api/profile" && request.method === "GET") return json(state.profile);
  if (apiPath === "/api/profile" && request.method === "PATCH") {
    state.profile = { ...state.profile, ...(await body<Partial<Profile>>(request)) };
    return json(saveState(state).profile);
  }
  if (apiPath === "/api/profile/claim-all-cards" && request.method === "POST") {
    const owned = new Set(state.collection.map((item) => item.cardId));
    for (const card of cards) {
      if (!owned.has(card.id)) {
        state.collection.push({ id: state.nextCollectionId++, cardId: card.id, packOpeningId: 99, acquiredAt: new Date().toISOString(), card });
      }
    }
    saveState(state);
    return json({ message: "All demo cards claimed!" });
  }
  if (apiPath.startsWith("/api/profile/search")) {
    const q = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";
    return json(friendProfiles.filter((profile) => profile.username?.includes(q) || profile.displayName?.toLowerCase().includes(q)));
  }
  if (apiPath === "/api/collection") return json(state.collection);
  if (apiPath.match(/^\/api\/users\/[^/]+\/collection$/)) {
    const grouped = cards.slice(3, 10).map((card, index) => ({ cardId: card.id, quantity: index % 2 === 0 ? 2 : 1, card }));
    return json(grouped);
  }
  if (apiPath === "/api/stats") {
    return json({
      totalStudySeconds: state.totalStudySeconds,
      sessionsCompleted: state.sessionsCompleted,
      cardsCollected: state.collection.length,
      packsOpened: state.packsOpened,
      uniqueCards: new Set(state.collection.map((item) => item.cardId)).size,
      legendaryCards: state.collection.filter((item) => item.card.rarity === "legendary").length,
      flashcardsCreated: state.flashcards.length,
      quizzesCreated: state.quizzes.length,
    });
  }
  if (apiPath === "/api/packs/status") {
    return json({
      available: state.totalStudySeconds >= 3600,
      studySecondsRequired: 3600,
      currentStudySeconds: state.totalStudySeconds,
      packsAvailable: Math.floor(state.totalStudySeconds / 3600),
    });
  }
  if (apiPath === "/api/study-sessions/start" && request.method === "POST") {
    return json({ id: state.nextSessionId++, startedAt: new Date().toISOString() });
  }
  if (apiPath.match(/^\/api\/study-sessions\/\d+\/stop$/) && request.method === "PATCH") {
    state.totalStudySeconds += 300;
    state.sessionsCompleted += 1;
    saveState(state);
    return json({ ok: true });
  }
  if (apiPath === "/api/packs/open" && request.method === "POST") {
    const start = state.collection.length % cards.length;
    const opened = [0, 1, 2].map((offset) => cards[(start + offset) % cards.length]);
    const packId = state.packsOpened + 1;
    const collected = opened.map((card) => ({
      id: state.nextCollectionId++,
      cardId: card.id,
      packOpeningId: packId,
      acquiredAt: new Date().toISOString(),
      card,
    }));
    state.collection.push(...collected);
    state.packsOpened = packId;
    state.totalStudySeconds = Math.max(0, state.totalStudySeconds - 3600);
    saveState(state);
    return json({ packId, cards: collected });
  }
  if (apiPath === "/api/study-materials" && request.method === "GET") return json(state.materials);
  if (apiPath === "/api/study-materials" && request.method === "POST") {
    const input = await body<{ title: string; content: string; type: string }>(request);
    const material: StudyMaterial = {
      id: state.nextMaterialId++,
      title: input.title,
      content: input.content,
      type: input.type,
      hasGeneratedContent: false,
      flashcardCount: 0,
      quizCount: 0,
      createdAt: new Date().toISOString(),
    };
    state.materials.unshift(material);
    saveState(state);
    return json(material);
  }
  const materialGenerate = apiPath.match(/^\/api\/study-materials\/(\d+)\/generate$/);
  if (materialGenerate && request.method === "POST") {
    const material = state.materials.find((item) => item.id === Number(materialGenerate[1]));
    if (!material) return json({ error: "Not found" }, { status: 404 });
    createGeneratedContent(material, state);
    saveState(state);
    return json({ ok: true });
  }
  const materialDelete = apiPath.match(/^\/api\/study-materials\/(\d+)$/);
  if (materialDelete && request.method === "DELETE") {
    const id = Number(materialDelete[1]);
    state.materials = state.materials.filter((item) => item.id !== id);
    state.flashcards = state.flashcards.filter((item) => item.materialId !== id);
    state.quizzes = state.quizzes.filter((item) => item.materialId !== id);
    saveState(state);
    return json({ ok: true });
  }
  if (apiPath === "/api/flashcards") {
    const materialId = Number(new URL(request.url).searchParams.get("materialId"));
    return json(state.flashcards.filter((item) => item.materialId === materialId));
  }
  if (apiPath === "/api/quizzes") {
    const materialId = Number(new URL(request.url).searchParams.get("materialId"));
    return json(state.quizzes.filter((item) => item.materialId === materialId));
  }

  return json({ error: "Local mock endpoint not found" }, { status: 404 });
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request ? input : new Request(input, init);
  const url = new URL(request.url, window.location.origin);
  if (url.origin === window.location.origin && url.pathname.includes("/api/")) {
    return handleApi(request, url.pathname);
  }
  return originalFetch(input, init);
};
