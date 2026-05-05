import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function HomeRedirect() {
  return (
    <Layout>
      <LandingPage />
    </Layout>
  );
}

function AppRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?"><Redirect to="/timer" /></Route>
            <Route path="/sign-up/*?"><Redirect to="/timer" /></Route>
            <Route path="/timer"><AppRoute component={TimerPage} /></Route>
            <Route path="/collection"><AppRoute component={CollectionPage} /></Route>
            <Route path="/study-tools"><AppRoute component={StudyToolsPage} /></Route>
            <Route path="/stats"><AppRoute component={StatsPage} /></Route>
            <Route path="/profile"><AppRoute component={ProfilePage} /></Route>
            <Route path="/friends"><AppRoute component={FriendsPage} /></Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
