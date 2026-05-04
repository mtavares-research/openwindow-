import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import TimerPage from "@/pages/timer";
import CollectionPage from "@/pages/collection";
import StudyToolsPage from "@/pages/study-tools";
import StatsPage from "@/pages/stats";
import LandingPage from "@/pages/landing";
import ProfilePage from "@/pages/profile";
import FriendsPage from "@/pages/friends";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk" as const,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#0097a7",
    colorForeground: "#0d3340",
    colorMutedForeground: "#3a7a8a",
    colorDanger: "#d32f2f",
    colorBackground: "#dff5fb",
    colorInput: "rgba(255,255,255,0.90)",
    colorInputForeground: "#0d3340",
    colorNeutral: "#8ab8c8",
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "w-[420px] max-w-full overflow-hidden rounded-2xl shadow-xl",
    card: "!shadow-none !border-0 !rounded-none",
    footer: "!shadow-none !border-0 !rounded-none",
    headerTitle: "font-bold",
    headerSubtitle: "",
    socialButtonsBlockButtonText: "font-medium",
    formFieldLabel: "text-sm font-medium",
    footerActionLink: "font-medium",
    footerActionText: "",
    dividerText: "",
    identityPreviewEditButton: "",
    formFieldSuccessText: "",
    alertText: "",
    logoBox: "flex justify-center",
    logoImage: "w-10 h-10",
    socialButtonsBlockButton: "",
    formButtonPrimary: "font-semibold",
    formFieldInput: "",
    footerAction: "",
    dividerLine: "",
    alert: "",
    otpCodeFieldInput: "text-center",
    formFieldRow: "gap-2",
    main: "gap-5",
  },
};

function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/timer" /></Show>
      <Show when="signed-out">
        <Layout><LandingPage /></Layout>
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in"><Layout><Component /></Layout></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full text-foreground relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 220, background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.60) 0%, transparent 75%)" }} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) qc.clear();
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your Study Sanctuary" } },
        signUp: { start: { title: "Create your sanctuary", subtitle: "Earn cards for every study session" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?"><AuthPage><SignInPage /></AuthPage></Route>
            <Route path="/sign-up/*?"><AuthPage><SignUpPage /></AuthPage></Route>
            <Route path="/timer"><ProtectedRoute component={TimerPage} /></Route>
            <Route path="/collection"><ProtectedRoute component={CollectionPage} /></Route>
            <Route path="/study-tools"><ProtectedRoute component={StudyToolsPage} /></Route>
            <Route path="/stats"><ProtectedRoute component={StatsPage} /></Route>
            <Route path="/profile"><ProtectedRoute component={ProfilePage} /></Route>
            <Route path="/friends"><ProtectedRoute component={FriendsPage} /></Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
