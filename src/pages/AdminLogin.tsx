import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, Eye, EyeOff, Shield, UserPlus, CheckCircle } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  // signup fields
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: 'Error de autenticación', description: error.message === 'Email not confirmed' ? 'Debes verificar tu correo electrónico antes de iniciar sesión.' : 'Credenciales inválidas. Verifica tu email y contraseña.', variant: 'destructive' });
    } else {
      toast({ title: 'Bienvenido', description: 'Acceso concedido al panel admin.' });
      navigate('/admin');
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { emailRedirectTo: window.location.origin + '/admin/login' },
    });
    if (error) {
      toast({ title: 'Error al registrarse', description: error.message, variant: 'destructive' });
    } else {
      setSignupDone(true);
    }
    setSignupLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-border/50 bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            WAXAPP<span className="text-primary">.</span> Staff
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Panel de administración y equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registro Staff</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="admin@waxapp.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-muted border-border" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-muted border-border" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verificando...' : 'Iniciar Sesión'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              {signupDone ? (
                <div className="text-center space-y-3 py-4">
                  <CheckCircle className="w-12 h-12 text-primary mx-auto" />
                  <h3 className="text-lg font-semibold text-foreground">¡Registro exitoso!</h3>
                  <p className="text-sm text-muted-foreground">
                    Hemos enviado un correo de verificación a <strong className="text-foreground">{signupEmail}</strong>. Debes verificar tu email antes de poder iniciar sesión.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Un administrador deberá asignarte un rol para que puedas acceder al panel.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                    <UserPlus className="w-4 h-4 inline mr-1" />
                    Al registrarte recibirás un correo de verificación. Un administrador deberá asignarte un rol para acceder al panel.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail" className="text-foreground">Email corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signupEmail" type="email" placeholder="nombre@empresa.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="pl-10 bg-muted border-border" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword" className="text-foreground">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signupPassword" type={showSignupPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-10 pr-10 bg-muted border-border" required minLength={6} />
                      <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={signupLoading}>
                    {signupLoading ? 'Registrando...' : 'Crear Cuenta de Staff'}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center">
            <Link to="/cliente" className="text-xs text-muted-foreground hover:text-foreground">
              ← Acceso para clientes
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
