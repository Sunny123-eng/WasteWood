import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }: { children: React.ReactNode; adminOnly?: boolean; superAdminOnly?: boolean }) {
  const { session, role, loading, isAdmin, isSuperAdmin, isPending } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!session) return <Navigate to="/auth" replace />;

  // Pending approval: send to pending screen
  if (!role) {
    if (isPending) return <Navigate to="/pending" replace />;
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Your account has no business assigned. Contact your admin.
      </div>
    );
  }

  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
