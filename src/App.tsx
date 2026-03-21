import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";

// Lazy load pages for code splitting
const PublicDashboard = lazy(() => import("./pages/PublicDashboard"));
const ApplicationForm = lazy(() => import("./pages/ApplicationForm"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const DEPanel = lazy(() => import("./pages/DEPanel"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
