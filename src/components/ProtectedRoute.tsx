import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { session, role, loading, isAdmin } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (!role) return (
    <div className="flex h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
      Your account has no role assigned. Contact admin.
    </div>
  );
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
