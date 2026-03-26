import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Temperatures from "./pages/Temperatures";
import Checklists from "./pages/Checklists";
import GoodsReceipt from "./pages/GoodsReceipt";
import Cleaning from "./pages/Cleaning";
import PestControl from "./pages/PestControl";
import HaccpPoints from "./pages/HaccpPoints";
import Training from "./pages/Training";
import Reports from "./pages/Reports";
import AdminUsers from "./pages/AdminUsers";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/temperatures" component={Temperatures} />
        <Route path="/checklists" component={Checklists} />
        <Route path="/goods-receipt" component={GoodsReceipt} />
        <Route path="/cleaning" component={Cleaning} />
        <Route path="/pest-control" component={PestControl} />
        <Route path="/haccp" component={HaccpPoints} />
        <Route path="/training" component={Training} />
        <Route path="/reports" component={Reports} />
        <Route path="/admin" component={AdminUsers} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
