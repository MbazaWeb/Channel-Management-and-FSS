import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import PublicDashboard from "./pages/PublicDashboard";
import ApplicationForm from "./pages/ApplicationForm";
import AdminPanel from "./pages/AdminPanel";
import DEPanel from "./pages/DEPanel";
import StatusPage from "./pages/StatusPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<PublicDashboard />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/apply" element={<ApplicationForm />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/de" element={<DEPanel />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
