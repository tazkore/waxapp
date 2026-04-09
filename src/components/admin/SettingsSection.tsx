import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Shield, ShieldCheck, ShieldOff, UserCog, Lock, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { couponsData, Coupon } from '@/data/dashboardData';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ManagedUser {
  id: string;
  email: string;
  created_at: string;
  role: string | null;
}

const SettingsSection = () => {
  const [seo, setSeo] = useState({ title: 'WAXAPP — Suplementos Bio-Tech de Alta Gama', description: 'Fórmulas con nanotecnología y hardware de bienestar. Legal, rápido y seguro.', keywords: 'nanotecnología, suplementos, bienestar, México', indexing: true });
  const [coupons, setCoupons] = useState<Coupon[]>(couponsData);

  // User management state
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('manage-users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios.', variant: 'destructive' });
    } else {
      setUsers(res.data as ManagedUser[]);
    }
    setLoadingUsers(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setSavingUserId(userId);
    const { data: { session } } = await supabase.auth.getSession();

    if (newRole === 'none') {
      const res = await supabase.functions.invoke('manage-users', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { user_id: userId },
      });
      if (res.error) {
        toast({ title: 'Error', description: 'No se pudo eliminar el rol.', variant: 'destructive' });
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: null } : u));
        toast({ title: 'Rol eliminado', description: 'El usuario ya no tiene acceso al panel.' });
      }
    } else {
      const res = await supabase.functions.invoke('manage-users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { user_id: userId, role: newRole },
      });
      if (res.error) {
        toast({ title: 'Error', description: 'No se pudo asignar el rol.', variant: 'destructive' });
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        toast({ title: 'Rol actualizado', description: `Rol cambiado a ${newRole}.` });
      }
    }
    setSavingUserId(null);
  };

  const handleDeleteCoupon = (code: string) => {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
    toast({ title: 'Cupón eliminado', description: code });
  };

  const getRoleBadge = (role: string | null) => {
    if (role === 'admin') return <Badge className="bg-primary/20 text-primary border-primary/30"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
    if (role === 'moderator') return <Badge className="bg-accent/20 text-accent-foreground border-accent/30"><Shield className="h-3 w-3 mr-1" />Moderador</Badge>;
    return <Badge variant="outline" className="text-muted-foreground"><ShieldOff className="h-3 w-3 mr-1" />Sin Rol</Badge>;
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Configuración y SEO</h1>

      {/* User & Role Management */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground text-lg">Gestión de Usuarios y Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Asigna roles para controlar el acceso al panel. <strong>Admin</strong> tiene acceso completo. <strong>Moderador</strong> solo puede ver datos sin modificar.
          </p>
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Registrado</TableHead>
                    <TableHead className="text-muted-foreground">Rol Actual</TableHead>
                    <TableHead className="text-muted-foreground">Cambiar Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="text-foreground font-medium">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.created_at).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={u.role ?? 'none'}
                            onValueChange={(v) => handleRoleChange(u.id, v)}
                            disabled={savingUserId === u.id}
                          >
                            <SelectTrigger className="bg-muted border-border w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderador</SelectItem>
                              <SelectItem value="none">Sin Rol</SelectItem>
                            </SelectContent>
                          </Select>
                          {savingUserId === u.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Section */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-foreground text-lg">SEO Global</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Meta Título</Label>
            <Input value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} className="bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Meta Descripción</Label>
            <Textarea value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} className="bg-muted border-border text-foreground" rows={3} />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Palabras Clave</Label>
            <Input value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} className="bg-muted border-border text-foreground" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label className="text-foreground">Activar Indexación en Google</Label>
            <Switch checked={seo.indexing} onCheckedChange={(v) => setSeo({ ...seo, indexing: v })} />
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
            onClick={() => toast({ title: 'SEO guardado', description: 'Configuración actualizada correctamente.' })}>
            Guardar Cambios
          </Button>
        </CardContent>
      </Card>

      {/* Coupons Section */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground text-lg">Gestor de Cupones</CardTitle>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-1" /> Crear Cupón
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground">Código</TableHead>
                  <TableHead className="text-muted-foreground">Descuento</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.code} className="border-border">
                    <TableCell className="font-mono text-foreground">{c.code}</TableCell>
                    <TableCell className="text-foreground">{c.discount}</TableCell>
                    <TableCell>
                      <Badge className={c.active ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground'}>
                        {c.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCoupon(c.code)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsSection;
