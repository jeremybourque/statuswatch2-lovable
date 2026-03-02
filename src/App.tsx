import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import StatusPage from "./pages/StatusPage";
import IncidentHistory from "./pages/IncidentHistory";
import AdminLayout from "./pages/AdminLayout";
import AdminServices from "./pages/AdminServices";
import AdminIncidents from "./pages/AdminIncidents";
import AdminSettings from "./pages/AdminSettings";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminTesting from "./pages/AdminTesting";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/:slug" element={<StatusPage />} />
          <Route path="/:slug/history" element={<IncidentHistory />} />
          <Route path="/:slug/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="incidents" replace />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="incidents" element={<AdminIncidents />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="testing" element={<AdminTesting />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
