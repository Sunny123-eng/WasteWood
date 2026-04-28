import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Clock } from 'lucide-react';

export default function Pending() {
  const { session, loading, role, isPending, signOut, refreshContext, user } = useAuth();

  useEffect(() => { document.title = 'Pending approval · Waste Wood ERP'; }, []);
  useEffect(() => {
    // Re-poll every 10s in case super admin approves
    const t = setInterval(refreshContext, 10000);
    return () => clearInterval(t);
  }, [refreshContext]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (role) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <CardTitle className="text-lg">Awaiting approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-center">
          <p className="text-muted-foreground">
            Aapka account <strong>{user?.email}</strong> super admin ki approval ke intezaar mein hai.
          </p>
          <p className="text-xs text-muted-foreground">
            {isPending
              ? 'Approval milte hi yeh page automatically aage badh jayega.'
              : 'Aapka account abhi tak kisi business se attached nahi hai.'}
          </p>
          <Button onClick={refreshContext} className="w-full" variant="secondary">
            <Loader2 className="mr-2 h-4 w-4" /> Check again
          </Button>
          <Button onClick={signOut} variant="ghost" size="sm" className="w-full">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
