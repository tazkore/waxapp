import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Eye, EyeOff, Lock, Phone, Globe, CheckCircle } from 'lucide-react';

const countries = [
  'México', 'Estados Unidos', 'España', 'Colombia', 'Argentina', 'Chile',
  'Perú', 'Ecuador', 'Venezuela', 'Guatemala', 'Cuba', 'Bolivia',
  'República Dominicana', 'Honduras', 'Paraguay', 'El Salvador',
  'Nicaragua', 'Costa Rica', 'Panamá', 'Uruguay', 'Puerto Rico', 'Otro',
];

const ClientAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setForgotSent(true);
    }
    setForgotLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: 'Error', description: error.message === 'Email not confirmed' ? 'Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.' : 'Credenciales inválidas.', variant: 'destructive' });
    } else {
      toast({ title: 'Bienvenido', description: 'Has iniciado sesión correctamente.' });
      navigate('/mi-cuenta');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !country) {
      toast({ title: 'Campos requeridos', description: 'Teléfono y país son obligatorios.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      toast({ title: 'Error al registrarse', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('customer_profiles').insert({
        user_id: data.user.id,
        full_name: fullName,
        phone,
        country,
        address: address || null,
        city: city || null,
        state: state || null,
        postal_code: postalCode || null,
      });

      if (profileError) {
        toast({ title: 'Error al crear perfil', description: profileError.message, variant: 'destructive' });
      } else {
        setSignupDone(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-border/50 bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <User className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            WAXAPP<span className="text-primary">.</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta de cliente'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signupDone ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle className="w-12 h-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold text-foreground">¡Cuenta creada!</h3>
              <p className="text-sm text-muted-foreground">
                Hemos enviado un correo de verificación a <strong className="text-foreground">{email}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Debes verificar tu email antes de poder iniciar sesión.
              </p>
              <Button variant="outline" onClick={() => { setSignupDone(false); setIsLogin(true); }} className="mt-2">
                Ir a Iniciar Sesión
              </Button>
            </div>
          ) : (
          {forgotMode ? (
            forgotSent ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle className="w-12 h-12 text-primary mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">¡Correo enviado!</h3>
                <p className="text-sm text-muted-foreground">
                  Hemos enviado un enlace de recuperación a <strong className="text-foreground">{forgotEmail}</strong>.
                </p>
                <Button variant="outline" onClick={() => { setForgotMode(false); setForgotSent(false); setIsLogin(true); }} className="mt-2">
                  Volver al inicio de sesión
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-muted-foreground">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
                <div className="space-y-2">
                  <Label htmlFor="forgotEmail" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="forgotEmail" type="email" placeholder="tu@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10 bg-muted border-border" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </Button>
                <button type="button" onClick={() => setForgotMode(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">
                  ← Volver al inicio de sesión
                </button>
              </form>
            )
          ) : (
          <>
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Nombre completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="fullName" placeholder="Tu nombre" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 bg-muted border-border" required />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-muted border-border" required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">Contraseña *</Label>
                {isLogin && (
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-muted border-border" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">Teléfono *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="phone" type="tel" placeholder="+52 55 1234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 bg-muted border-border" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">País *</Label>
                  <Select value={country} onValueChange={setCountry} required>
                    <SelectTrigger className="bg-muted border-border">
                      <Globe className="w-4 h-4 text-muted-foreground mr-2" />
                      <SelectValue placeholder="Selecciona tu país" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-foreground">Dirección</Label>
                  <Input id="address" placeholder="Calle y número" value={address} onChange={(e) => setAddress(e.target.value)} className="bg-muted border-border" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-foreground">Ciudad</Label>
                    <Input id="city" placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} className="bg-muted border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-foreground">Estado</Label>
                    <Input id="state" placeholder="Estado" value={state} onChange={(e) => setState(e.target.value)} className="bg-muted border-border" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-foreground">Código Postal</Label>
                  <Input id="postalCode" placeholder="00000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="bg-muted border-border" />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">o continúa con</span></div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-border"
            onClick={async () => {
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result.error) {
                toast({ title: 'Error', description: 'No se pudo iniciar sesión con Google.', variant: 'destructive' });
              }
              if (result.redirected) return;
              navigate('/mi-cuenta');
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continuar con Google
          </Button>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <p>¿No tienes cuenta?{' '}
                <button onClick={() => setIsLogin(false)} className="text-primary hover:underline">Regístrate</button>
              </p>
            ) : (
              <p>¿Ya tienes cuenta?{' '}
                <button onClick={() => setIsLogin(true)} className="text-primary hover:underline">Inicia sesión</button>
              </p>
            )}
          </div>

          <div className="mt-3 text-center">
            <Link to="/admin/login" className="text-xs text-muted-foreground hover:text-foreground">
              Acceso administradores →
            </Link>
          </div>
          </>
          )}
          
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAuth;
