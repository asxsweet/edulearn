import { Navigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: 'student' | 'admin';
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, authReady } = useApp();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
  }

  return <>{children}</>;
}
