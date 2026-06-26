import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { Layout } from "./components/layout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import { Loader2 } from "lucide-react";
import ActivityPage from "./pages/activity";
import { useEffect } from "react";

import Dashboard from "./pages/dashboard";
import ContractsList from "./pages/contracts/index";
import NewContract from "./pages/contracts/new";
import SelectTemplate from "./pages/contracts/select-template";
import ContractWorkspace from "./pages/contracts/[id]";
import VendorsList from "./pages/vendors/index";
import OwnersList from "./pages/owners/index";
import ArchitectsList from "./pages/architects/index";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/contracts" component={ContractsList} />
        <Route path="/contracts/select-template" component={SelectTemplate} />
        <Route path="/contracts/new" component={NewContract} />
        <Route path="/contracts/:id" component={ContractWorkspace} />
        <Route path="/vendors" component={VendorsList} />
        <Route path="/owners" component={OwnersList} />
        <Route path="/architects" component={ArchitectsList} />
        <Route path="/activity" component={ActivityPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login", { replace: true });
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route>
        <ProtectedRoute>
          <Router />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;