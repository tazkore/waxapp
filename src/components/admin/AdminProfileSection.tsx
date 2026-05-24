import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ProfileSidebar from '@/components/ProfileSidebar';
import { MapPin, Bell, KeyRound } from 'lucide-react';

type ProfileForm = {
  full_name: string;
  phone: string;
};

type ActiveTab = 'account' | 'security';

const AdminProfileSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('account');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: { full_name: '', phone: '' },
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      setUser(authUser);
      setAvatarUrl(authUser.user_metadata?.avatar_url ?? null);
      setValue('full_name', authUser.user_metadata?.full_name ?? '');
      setValue('phone', authUser.user_metadata?.phone ?? '');
      setLoading(false);
    });
  }, [setValue]);

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: data.full_name, phone: data.phone },
      });
      if (error) throw error;
      setUser((prev: any) => ({
        ...prev,
        user_metadata: { ...prev?.user_metadata, full_name: data.full_name, phone: data.phone },
      }));
      toast({ title: 'Perfil actualizado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Contraseña muy corta', description: 'Mínimo 8 caracteres.', variant: 'destructive' });
      return;
    }
    setChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Contraseña actualizada' });
      setNewPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    } finally {
      setChangingPwd(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';

  const navItems = [
    { key: 'account', label: 'Mi Cuenta', icon: MapPin, active: activeTab === 'account', onClick: () => setActiveTab('account') },
    { key: 'security', label: 'Seguridad', icon: KeyRound, active: activeTab === 'security', onClick: () => setActiveTab('security') },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 min-h-[500px]">
      <ProfileSidebar
        userId={user?.id ?? ''}
        avatarUrl={avatarUrl}
        name={displayName}
        email={user?.email}
        role="Admin"
        navItems={navItems}
        onAvatarUpdated={(url) => {
          setAvatarUrl(url);
          setUser((prev: any) => ({
            ...prev,
            user_metadata: { ...prev?.user_metadata, avatar_url: url },
          }));
        }}
        className="w-full md:w-56 shrink-0 flex flex-col"
      />

      <div className="flex-1 max-w-lg">
        {activeTab === 'account' && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Datos del Administrador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <Input value={user?.email ?? ''} disabled className="bg-muted border-border opacity-60" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Nombre completo</Label>
                  <Input {...register('full_name')} className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Teléfono</Label>
                  <Input {...register('phone')} className="bg-muted border-border" placeholder="+52 55 1234 5678" />
                </div>
                <Button type="submit" disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar Cambios
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Cambiar Contraseña
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nueva contraseña</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-muted border-border"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                />
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={changingPwd || newPassword.length < 8}
                className="w-full gap-2"
              >
                {changingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Actualizar Contraseña
              </Button>
              <p className="text-xs text-muted-foreground">
                Por seguridad se cerrará tu sesión en otros dispositivos al cambiar la contraseña.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminProfileSection;
