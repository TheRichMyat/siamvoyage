import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isOfficeAuthenticated } from './auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!isOfficeAuthenticated()) {
    return <Navigate to="/office/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
