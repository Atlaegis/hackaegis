import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Navbar } from "@/components/layout/Navbar";
import Home from "@/pages/Home";
import Watch from "@/pages/Watch";
import Results from "@/pages/Results";
import Admin from "@/pages/admin/index";
import JudgePortal from "./pages/judges/index";
import CandidatePortal from "./pages/candidate/index";
import Register from "@/pages/Register";
import { WaveLoader } from "@/components/WaveLoader";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

function Router() {
  const [location] = useLocation();
  const hideNavbar = location.startsWith("/candidate") || location.startsWith("/judges") || location.startsWith("/admin");

  return (
    <div className="flex flex-col min-h-screen">
      {!hideNavbar && <Navbar />}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/register" component={Register} />
          <Route path="/watch">{() => <Redirect to="/candidate/live" />}</Route>
          <Route path="/candidate" component={CandidatePortal} />
          <Route path="/candidate/:section" component={CandidatePortal} />
          <Route path="/results" component={Results} />
          <Route path="/results/:slug" component={Results} />
          <Route path="/admin" component={Admin} />
          <Route path="/judges" component={JudgePortal} />
          <Route path="/judges/:section" component={JudgePortal} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}> 
          {loading ? <WaveLoader /> : <Router />}
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
