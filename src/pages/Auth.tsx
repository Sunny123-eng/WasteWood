import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogIn, KeyRound, Mail } from 'lucide-react';

export default function Auth() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = 'Login · Waste Wood ERP'; }, []);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (session) return <Navigate to="/" replace />;

  const handlePassword = async () => {
    if (!email || !password) return toast({ title: 'Enter email and password', variant: 'destructive' });
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: 'Account created', description: 'You can now sign in.' });
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const sendOtp = async () => {
    if (!email) return toast({ title: 'Enter email', variant: 'destructive' });
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setOtpSent(true);
      toast({ title: 'Code sent', description: 'Check your email for the 6-digit code.' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    if (!otp) return toast({ title: 'Enter the code', variant: 'destructive' });
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: 'Invalid code', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Waste Wood Trading</CardTitle>
          <p className="text-xs text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password">
            <TabsList className="w-full">
              <TabsTrigger value="password" className="flex-1"><KeyRound className="h-3.5 w-3.5 mr-1" />Password</TabsTrigger>
              <TabsTrigger value="otp" className="flex-1"><Mail className="h-3.5 w-3.5 mr-1" />Email OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="space-y-3 mt-4">
              <div className="flex gap-1 text-xs">
                <button onClick={() => setMode('signin')} className={`flex-1 py-1 rounded ${mode === 'signin' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Sign in</button>
                <button onClick={() => setMode('signup')} className={`flex-1 py-1 rounded ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>First-time setup</button>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              </div>
              <Button onClick={handlePassword} disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4 mr-2" />{mode === 'signup' ? 'Create account' : 'Sign in'}</>}
              </Button>
              {mode === 'signup' && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Only the registered admin and user emails can create accounts.
                </p>
              )}
            </TabsContent>

            <TabsContent value="otp" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={otpSent} />
              </div>
              {!otpSent ? (
                <Button onClick={sendOtp} disabled={busy} className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-2" />Send code</>}
                </Button>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>6-digit code</Label>
                    <Input value={otp} onChange={e => setOtp(e.target.value)} inputMode="numeric" maxLength={6} />
                  </div>
                  <Button onClick={verifyOtp} disabled={busy} className="w-full">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & sign in'}
                  </Button>
                  <button onClick={() => { setOtpSent(false); setOtp(''); }} className="text-xs text-muted-foreground underline w-full text-center">
                    Use a different email
                  </button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
