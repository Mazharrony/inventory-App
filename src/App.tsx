import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SimpleAuthProvider, useAuth } from "@/contexts/SimpleAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { SimplePageLoader } from "@/components/PageLoader";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Analytics = lazy(() => import("./pages/Analytics"));
const InventoryPage = lazy(() => import("./pages/Products"));
const Auth = lazy(() => import("./pages/AuthNew"));
const Profile = lazy(() => import("./pages/Profile"));
const SettingsFixed = lazy(() => import("./pages/SettingsFixed"));
const Sellers = lazy(() => import("./pages/Sellers"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isLoading } = useAuth();

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

  return (
    <Routes>
      <Route path="/auth" element={
        <Suspense fallback={<SimplePageLoader />}>
          <Auth />
        </Suspense>
      } />
      <Route path="/" element={
        <Layout>
          <ProtectedRoute>
            <Suspense fallback={<SimplePageLoader />}>
              <Index />
            </Suspense>
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/analytics" element={
        <Layout>
          <ProtectedRoute>
            <Suspense fallback={<SimplePageLoader />}>
              <Analytics />
            </Suspense>
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/inventory" element={
        <Layout>
          <ProtectedRoute requireAdminOrAccountant={true}>
            <Suspense fallback={<SimplePageLoader />}>
              <InventoryPage />
            </Suspense>
          </ProtectedRoute>
        </Layout>
      } />
      {/* Profile Route - Available to all authenticated users */}
      <Route path="/profile" element={
        <Layout>
          <ProtectedRoute>
            <Suspense fallback={<SimplePageLoader />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        </Layout>
      } />
      {/* Help Page - Available to all authenticated users */}
      <Route path="/help" element={
        <Layout>
          <ProtectedRoute>
            <Suspense fallback={<SimplePageLoader />}>
              <Help />
            </Suspense>
          </ProtectedRoute>
        </Layout>
      } />
      {/* Admin-only Settings Route for User Management */}
      <Route path="/settings" element={
        <Layout>
          <ProtectedRoute requireAdmin={true}>
            <Suspense fallback={<SimplePageLoader />}>
              <SettingsFixed />
            </Suspense>
          </ProtectedRoute>
        </Layout>
      } />
      {/* Sellers/Users Management Route */}
      <Route path="/sellers" element={
        <Layout>
          <ProtectedRoute requireAdmin={true}>
            <Suspense fallback={<SimplePageLoader />}>
              <Sellers />
            </Suspense>
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="*" element={
        <Layout>
          <Suspense fallback={<SimplePageLoader />}>
            <NotFound />
          </Suspense>
        </Layout>
      } />
    </Routes>
  );
};

// AppRoutes wrapper - no redirect logic needed, ProtectedRoute handles auth
const AppRoutesWrapper = () => {
  const { isLoading } = useAuth();

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

  return <AppRoutes />;
};

const App = () => {
  // Only use basename in production GitHub Pages deployment
  const basename = process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES ? '/JNK-INVENTORY' : undefined;

  return (
    <ErrorBoundary>
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
              <AppRoutesWrapper />
            </BrowserRouter>
          </TooltipProvider>
        </SimpleAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
