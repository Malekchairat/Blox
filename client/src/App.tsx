import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ScreenReaderToolbar } from "./components/ScreenReaderToolbar";
import { VoiceAssistant } from "./components/VoiceAssistant";
import { AIChatBot } from "./components/AIChatBot";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import Home from "./pages/Home";
import CaseDetail from "./pages/CaseDetail";
import CreateCase from "./pages/CreateCase";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AssociationDashboard from "./pages/AssociationDashboard";
import DonorDashboard from "./pages/DonorDashboard";

import { NeurodivergentProvider } from "./contexts/NeurodivergentContext";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/case/:id" component={CaseDetail} />
      <Route path="/create-case" component={CreateCase} />
      <Route path="/dashboard/admin" component={AdminDashboard} />
      <Route path="/dashboard/admin/users" component={AdminUsers} />
      <Route path="/dashboard/association" component={AssociationDashboard} />
      <Route path="/dashboard/donor" component={DonorDashboard} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <NeurodivergentProvider>
        <ThemeProvider
          defaultTheme="light"
          switchable
        >
          <TooltipProvider>
            <Toaster />
            <ScreenReaderToolbar />
            <VoiceAssistant />
            <AIChatBot />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
        </NeurodivergentProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}

export default App;
