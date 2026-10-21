import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { can, hasBackofficeAccess, type Permission } from '../../domain/auth/permissions';
import { useAuth } from './AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { NoRolePage } from '../pages/NoRolePage';

/**
 * Protección de rutas en el cliente. Es solo UX: la seguridad real está en
 * firestore.rules y en Cloud Functions.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.role) return <NoRolePage />;
  return <>{children}</>;
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!can(user?.role, permission)) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}

export function RequireBackoffice({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!hasBackofficeAccess(user?.role)) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}

/** Página de inicio según rol. */
export function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'auditor') return <Navigate to="/admin" replace />;
  return <Navigate to="/app" replace />;
}
