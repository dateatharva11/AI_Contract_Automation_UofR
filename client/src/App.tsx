import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { Layout } from "./components/layout";
import NotFound from "@/pages/not-found";

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
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
