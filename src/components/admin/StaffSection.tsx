import { useState, useEffect } from 'react';
import { Loader2, Shield, ShieldCheck, ShieldOff, UserCog, UserPlus, Crown, Search, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { ALL_PERMISSIONS } from '@/hooks/usePermissions';

interface ManagedUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string | null;
  role: string | null;
}

const StaffSection = () => {
  const { isSuperAdmin } = useUserRole();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'staff' | 'clients'>('all');

  const [openCreate, setOpenCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('moderator');
  const [creating, setCreating] = useState(false);

  const [permsUser, setPermsUser] = useState<ManagedUser | null>(null);
  const [permsSelected, setPermsSelected] = useState<string[]>([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);
  const [allSubStores, setAllSubStores] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [storeAssignments, setStoreAssignments] = useState<Record<string, string>>({}); // storeId -> role

  const openPermissions = async (u: ManagedUser) => {
    setPermsUser(u);
    setPermsLoading(true);
    setPermsSelected([]);
    setStoreAssignments({});
    const { data: { session } } = await supabase.auth.getSession();
    const [permsRes, subsRes, assignRes] = await Promise.all([
      supabase.functions.invoke('manage-users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: 'list_permissions', user_id: u.id },
      }),
      supabase.from('sub_stores').select('id,name,slug').eq('is_active', true).order('name'),
      supabase.functions.invoke('manage-users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: 'list_substore_access', user_id: u.id },
      }),
    ]);
    if (!permsRes.error && !permsRes.data?.error) setPermsSelected(permsRes.data?.permissions ?? []);
    setAllSubStores(subsRes.data ?? []);
    const map: Record<string, string> = {};
    (assignRes.data?.assignments ?? []).forEach((a: any) => { map[a.sub_store_id] = a.role; });
    setStoreAssignments(map);
    setPermsLoading(false);
  };

  const togglePerm = (key: string) => {
    setPermsSelected(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const savePermissions = async () => {
    if (!permsUser) return;
    setPermsSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const assignments = Object.entries(storeAssignments).map(([sub_store_id, role]) => ({ sub_store_id, role }));
    const [permsRes, storesRes] = await Promise.all([
      supabase.functions.invoke('manage-users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: 'set_permissions', user_id: permsUser.id, permissions: permsSelected },
      }),
      supabase.functions.invoke('manage-users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: 'set_substore_access', user_id: permsUser.id, assignments },
      }),
    ]);
    if (permsRes.error || permsRes.data?.error || storesRes.error || storesRes.data?.error) {
      toast({ title: 'Error', description: permsRes.data?.error || storesRes.data?.error || 'No se pudieron guardar.', variant: 'destructive' });
    } else {
      toast({ title: 'Permisos y tiendas actualizados', description: permsUser.email });
      setPermsUser(null);
    }
    setPermsSaving(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('manage-users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) {
      toast({ title: 'Error al cargar usuarios', description: 'La función manage-users no está disponible. Verifica que el Edge Function esté desplegado.', variant: 'destructive' });
      setUsers([]);
    } else {
      setUsers((res.data as ManagedUser[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setSavingId(userId);
    const { data: { session } } = await supabase.auth.getSession();

    if (newRole === 'none') {
      const res = await supabase.functions.invoke('manage-users', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { user_id: userId },
      });
      if (res.error || res.data?.error) {
        toast({ title: 'Error', description: res.data?.error || 'No se pudo eliminar el rol.', variant: 'destructive' });
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: null } : u));
        toast({ title: 'Rol eliminado' });
      }
    } else {
      const res = await supabase.functions.invoke('manage-users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { user_id: userId, role: newRole },
      });
      if (res.error || res.data?.error) {
        toast({ title: 'Error', description: res.data?.error || 'No se pudo asignar el rol.', variant: 'destructive' });
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        toast({ title: 'Rol actualizado', description: `Nuevo rol: ${newRole}` });
      }
    }
    setSavingId(null);
  };

  const handleCreate = async () => {
    if (!email || !password) {
      toast({ title: 'Error', description: 'Email y contraseña son requeridos.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('manage-users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: { action: 'create_staff', email, password, role },
    });
    if (res.error || res.data?.error) {
      toast({ title: 'Error', description: res.data?.error || 'No se pudo crear.', variant: 'destructive' });
    } else {
      toast({ title: 'Staff creado', description: `${email} (${role})` });
      setOpenCreate(false);
      setEmail(''); setPassword(''); setRole('moderator');
      fetchUsers();
    }
    setCreating(false);
  };

  const getRoleBadge = (r: string | null) => {
    if (r === 'super_admin') return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>;
    if (r === 'admin') return <Badge className="bg-primary/20 text-primary border-primary/30"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
    if (r === 'moderator') return <Badge className="bg-accent/20 text-accent-foreground border-accent/30"><Shield className="h-3 w-3 mr-1" />Moderador</Badge>;
    return <Badge variant="outline" className="text-muted-foreground"><ShieldOff className="h-3 w-3 mr-1" />Cliente</Badge>;
  };

  const filtered = users.filter(u => {
    if (search && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'staff' && !u.role) return false;
    if (filter === 'clients' && u.role) return false;
    return true;
  });

  const stats = {
    total: users.length,
    staff: users.filter(u => u.role).length,
    superAdmins: users.filter(u => u.role === 'super_admin').length,
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff & Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona el equipo y sus permisos en el panel.</p>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Crear Staff
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Usuarios</p><p className="text-2xl font-bold text-foreground">{stats.total}</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Staff</p><p className="text-2xl font-bold text-primary">{stats.staff}</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Super Admins</p><p className="text-2xl font-bold text-yellow-600">{stats.superAdmins}</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Admins</p><p className="text-2xl font-bold text-foreground">{stats.admins}</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Moderadores</p><p className="text-2xl font-bold text-foreground">{stats.moderators}</p></CardContent></Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground text-lg">Directorio</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted border-border" />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="bg-muted border-border w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="staff">Solo Staff</SelectItem>
                <SelectItem value="clients">Solo Clientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Registrado</TableHead>
                    <TableHead className="text-muted-foreground">Último Acceso</TableHead>
                    <TableHead className="text-muted-foreground">Rol</TableHead>
                    <TableHead className="text-muted-foreground">Cambiar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const targetIsSuper = u.role === 'super_admin';
                    const disabled = savingId === u.id || (targetIsSuper && !isSuperAdmin);
                    return (
                      <TableRow key={u.id} className="border-border">
                        <TableCell className="text-foreground font-medium">{u.email}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString('es-MX')}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('es-MX') : '—'}</TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select value={u.role ?? 'none'} onValueChange={(v) => handleRoleChange(u.id, v)} disabled={disabled}>
                              <SelectTrigger className="bg-muted border-border w-40"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="moderator">Moderador</SelectItem>
                                <SelectItem value="none">Sin Rol (Cliente)</SelectItem>
                              </SelectContent>
                            </Select>
                            {isSuperAdmin && u.role && u.role !== 'super_admin' && (
                              <Button size="sm" variant="outline" onClick={() => openPermissions(u)} className="gap-1">
                                <Key className="h-3 w-3" /> Permisos
                              </Button>
                            )}
                            {savingId === u.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin resultados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground">Crear Usuario Staff</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Contraseña</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-muted border-border" placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Rol</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />} Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permsUser} onOpenChange={(o) => !o && setPermsUser(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" /> Permisos de {permsUser?.email}
            </DialogTitle>
            <DialogDescription>
              Selecciona las funciones que este usuario puede usar. El super admin siempre tiene acceso total.
            </DialogDescription>
          </DialogHeader>
          {permsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Permisos globales</p>
                <div className="grid grid-cols-1 gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p.key} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer border border-border">
                      <Checkbox checked={permsSelected.includes(p.key)} onCheckedChange={() => togglePerm(p.key)} />
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{p.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.key}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {allSubStores.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Tiendas asignadas (administrador por marca)</p>
                  <div className="grid grid-cols-1 gap-2">
                    {allSubStores.map(s => {
                      const assigned = !!storeAssignments[s.id];
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-2 rounded-md border border-border">
                          <Checkbox
                            checked={assigned}
                            onCheckedChange={(v) => {
                              setStoreAssignments(prev => {
                                const next = { ...prev };
                                if (v) next[s.id] = next[s.id] || 'admin';
                                else delete next[s.id];
                                return next;
                              });
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">/s/{s.slug}</p>
                          </div>
                          {assigned && (
                            <Select value={storeAssignments[s.id]} onValueChange={(v) => setStoreAssignments(prev => ({ ...prev, [s.id]: v }))}>
                              <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="moderator">Moderador</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermsUser(null)}>Cancelar</Button>
            <Button onClick={savePermissions} disabled={permsSaving} className="gap-2">
              {permsSaving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffSection;
