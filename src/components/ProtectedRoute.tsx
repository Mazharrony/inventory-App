import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { Loader2, Package } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireAdminOrAccountant?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requireAdmin = false,
  requireAdminOrAccountant = false
}: ProtectedRouteProps) => {
  const { user, isAdmin, isAccountant, isLoading } = useAuth();

  // Always show loading state first to prevent flash redirects
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <div className="text-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6 text-primary-foreground animate-pulse" />
          </div>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <h2 className="text-lg font-semibold">Loading...</h2>
          </div>
          <p className="text-muted-foreground">Please wait while we verify your access</p>
        </div>
      </div>
    );
  }

  // Only check auth requirements after loading is complete
  if (requireAuth && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this area.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact an administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (requireAdminOrAccountant && !isAdmin && !isAccountant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this area.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact an administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};