import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

/**
 * AuthGuard - Protects routes from unauthenticated access.
 * Redirects to /auth if no token exists.
 * Optionally restricts by role (allowedRoles).
 */
export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const token = localStorage.getItem('token');
  if (!token || !user) {
    // Redirect to /auth and remember where they came from
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // User is logged in but doesn't have the right role
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
