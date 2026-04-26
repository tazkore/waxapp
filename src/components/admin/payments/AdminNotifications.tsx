import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminNotification {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

const SEVERITY_STYLES: Record<string, { icon: typeof Info; cls: string }> = {
  warning: { icon: AlertTriangle, cls: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
  error: { icon: AlertTriangle, cls: 'text-destructive bg-destructive/10 border-destructive/30' },
  info: { icon: Info, cls: 'text-primary bg-primary/10 border-primary/30' },
};

const AdminNotifications = () => {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRead, setShowRead] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!showRead) q = q.is('read_at', null);
    const { data } = await q;
    setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [showRead]);

  const markRead = async (id: string) => {
    await supabase.from('admin_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  const markAllRead = async () => {
    await supabase
      .from('admin_notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);
    toast.success('Notificaciones marcadas como leídas');
    load();
  };

  const runExpireNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('expire-pending-payments');
      if (error) throw error;
      const r = data as { expired: number; orders_cancelled: number };
      toast.success(`${r.expired} pagos expirados · ${r.orders_cancelled} pedidos cancelados`);
      load();
    } catch (e) {
      toast.error('Error: ' + (e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bell className="h-4 w-4 text-primary" />
          Notificaciones del sistema
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">{unreadCount}</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowRead((v) => !v)}>
            {showRead ? 'Solo no leídas' : 'Ver todas'}
          </Button>
          <Button variant="outline" size="sm" disabled={running} onClick={runExpireNow}>
            {running ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null}
            Ejecutar expirador ahora
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" /> Marcar todas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sin notificaciones {showRead ? '' : 'nuevas'}.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const sev = SEVERITY_STYLES[n.severity] ?? SEVERITY_STYLES.info;
              const Icon = sev.icon;
              const meta = n.metadata as { count?: number; orders_cancelled?: number; total_amount?: number };
              return (
                <div
                  key={n.id}
                  className={`border rounded p-3 flex items-start gap-3 ${sev.cls} ${n.read_at ? 'opacity-60' : ''}`}
                >
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{n.title}</p>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(n.created_at).toLocaleString('es-MX')}
                      </span>
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                    {meta?.count != null && (
                      <div className="flex gap-2 flex-wrap text-[11px]">
                        <Badge variant="outline">{meta.count} tx</Badge>
                        {meta.orders_cancelled != null && (
                          <Badge variant="outline">{meta.orders_cancelled} pedidos</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {!n.read_at && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => markRead(n.id)} title="Marcar leída">
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminNotifications;
