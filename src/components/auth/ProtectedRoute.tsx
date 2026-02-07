/**
 * Protected Route Component
 * Enforces role-based access control on routes.
 * Phase 6.5: UI & Dashboards (Frontend)
 */
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { useRole } from './RoleContext';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Roles allowed to access this route. Empty = any authenticated user */
  allowedRoles?: AppRole[];
  /** Redirect path for unauthorized access */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles = [],
  redirectTo = '/auth',
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { canAccessRoute, role } = useRole();
  const location = useLocation();

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role authorization
  if (allowedRoles.length > 0 && !canAccessRoute(allowedRoles)) {
    // Redirect to dashboard if user is authenticated but not authorized
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for role-based visibility
 */
export function RoleGate({ 
  children, 
  allowedRoles 
}: { 
  children: ReactNode; 
  allowedRoles: AppRole[];
}) {
  const { canAccessRoute } = useRole();
  
  if (!canAccessRoute(allowedRoles)) {
    return null;
  }
  
  return <>{children}</>;
}

export default ProtectedRoute;
