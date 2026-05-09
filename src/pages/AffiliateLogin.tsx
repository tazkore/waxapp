import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Briefcase } from 'lucide-react';

const AffiliateLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/portal-vendedores', { replace: true });
    });
  }, [navigate]);

  const handle = async () => {
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/portal-vendedores`, data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.user) {
          const code = `AFF-${data.user.id.slice(0, 6).toUpperCase()}`;
          await supabase.from('affiliates').insert({
            user_id: data.user.id, full_name: fullName, email, phone, code, status: 'pending',
          } as any);
        }
        toast.success('Solicitud enviada — espera aprobación del administrador.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/portal-vendedores', { replace: true });
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> Portal de Vendedores
          </CardTitle>
          <p className="text-xs text-muted-foreground">{mode === 'login' ? 'Inicia sesión con tu cuenta de afiliado' : 'Solicita tu cuenta de vendedor (15% comisión)'}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {mode === 'signup' && (
            <>
              <div className="space-y-1.5"><Label>Nombre completo</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-muted border-border" /></div>
              <div className="space-y-1.5"><Label>Teléfono</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-muted border-border" /></div>
            </>
          )}
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-muted border-border" /></div>
          <div className="space-y-1.5"><Label>Contraseña</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-muted border-border" /></div>
          <Button onClick={handle} disabled={loading || !email || !password} className="w-full gap-2 mt-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Solicitar acceso'}
          </Button>
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="block w-full text-xs text-center text-muted-foreground hover:text-primary mt-2">
            {mode === 'login' ? '¿No tienes cuenta? Solicita ser vendedor' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
          <Link to="/" className="block text-[11px] text-center text-muted-foreground hover:text-foreground mt-3">← Volver a la tienda</Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateLogin;
