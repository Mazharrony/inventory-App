import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SimpleAuthProvider, useAuth } from "@/contexts/SimpleAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DemoMode } from "@/components/DemoMode";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import InventoryPage from "./pages/Products";
import Auth from "./pages/AuthNew";
import Profile from "./pages/Profile";
import SettingsFixed from "./pages/SettingsFixed";
import Sellers from "./pages/Sellers";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { hasSupabaseConfig, isLoading } = useAuth();

  // Show loading while auth context is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <div className="text-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 animate-pulse bg-primary-foreground rounded" />
          </div>
          <h2 className="text-lg font-semibold">Starting JNK Nutrition System...</h2>
        </div>
      </div>
    );
  }

  if (!hasSupabaseConfig) {
    return <DemoMode />;
  }

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={
        <Layout>
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/analytics" element={
        <Layout>
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/inventory" element={
        <Layout>
          <ProtectedRoute requireAdminOrAccountant={true}>
            <InventoryPage />
          </ProtectedRoute>
        </Layout>
      } />
      {/* Profile Route - Available to all authenticated users */}
      <Route path="/profile" element={
        <Layout>
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Layout>
      } />
      {/* Help Page - Available to all authenticated users */}
      <Route path="/help" element={
        <Layout>
          <ProtectedRoute>
            <Help />
          </ProtectedRoute>
        </Layout>
      } />
      {/* Admin-only Settings Route for User Management */}
      <Route path="/settings" element={
        <Layout>
          <ProtectedRoute requireAdmin={true}>
            <SettingsFixed />
          </ProtectedRoute>
        </Layout>
      } />
      {/* Sellers/Users Management Route */}
      <Route path="/sellers" element={
        <Layout>
          <ProtectedRoute requireAdmin={true}>
            <Sellers />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="*" element={
        <Layout>
          <NotFound />
        </Layout>
      } />
    </Routes>
  );
};

const App = () => {
  // Only use basename in production GitHub Pages deployment
  const basename = process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES ? '/JNK-INVENTORY' : undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <SimpleAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            basename={basename}
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </SimpleAuthProvider>
    </QueryClientProvider>
  );
};

export default App;
