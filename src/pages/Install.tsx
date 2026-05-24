import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Share, Plus, ArrowDown, Smartphone, Chrome, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type OS = 'ios' | 'android' | 'desktop' | 'unknown';

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/Windows|Macintosh|Linux/.test(ua)) return 'desktop';
  return 'unknown';
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

const Install = () => {
  const [os, setOs] = useState<OS>('unknown');
  const [installed, setInstalled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const deferredPromptRef = useRef<Event | null>(null);

  useEffect(() => {
    document.title = 'Instalar App | WAXAPP';
    setOs(detectOS());
    setInstalled(isStandalone());
    setNotificationsEnabled(Notification.permission === 'granted');

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => {
          console.log('[SW] Registrado:', reg.scope);
          setSwReady(true);
        })
        .catch((err) => console.error('[SW] Error al registrar:', err));
    }

    // Capturar evento de instalación (Android / Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAndroidInstall = async () => {
    const prompt = deferredPromptRef.current as (Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }) | null;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        toast({ title: '¡WAXAPP instalada!', description: 'Encuéntrala en tu pantalla de inicio.' });
      }
    } else {
      toast({
        title: 'Instalación manual',
        description: 'En Chrome: toca ⋮ → "Añadir a pantalla de inicio".',
      });
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationsEnabled(false);
      return;
    }

    if (!('Notification' in window)) {
      toast({ title: 'No compatible', description: 'Tu navegador no soporta notificaciones.', variant: 'destructive' });
      return;
    }

    setNotifLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({ title: 'Permiso denegado', description: 'Activa las notificaciones en los ajustes de tu navegador.', variant: 'destructive' });
        setNotifLoading(false);
        return;
      }

      setNotificationsEnabled(true);

      // Suscribir via Push API si hay VAPID key configurada
      if (VAPID_PUBLIC_KEY && 'serviceWorker' in navigator && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // Guardar suscripción vinculada al usuario autenticado
        const { data: { session } } = await supabase.auth.getSession();
        const subJson = subscription.toJSON();

        await supabase.from('push_subscriptions').upsert({
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh ?? null,
          auth: subJson.keys?.auth ?? null,
          user_id: session?.user?.id ?? null,
          user_agent: navigator.userAgent.slice(0, 255),
        }, { onConflict: 'endpoint' });

        toast({ title: '¡Notificaciones activadas!', description: 'Recibirás alertas y promociones de WAXAPP.' });
      } else {
        toast({ title: '¡Permiso concedido!', description: 'Las notificaciones locales están activas.' });
      }
    } catch (err) {
      console.error('[Notifications] Error:', err);
      toast({ title: 'Error', description: 'No se pudo activar las notificaciones. Intenta de nuevo.', variant: 'destructive' });
      setNotificationsEnabled(false);
    }
    setNotifLoading(false);
  };

  const iosSteps = [
    { icon: Share, label: 'Toca el botón Compartir', desc: 'El ícono de cuadrado con flecha hacia arriba en la barra inferior de Safari' },
    { icon: Plus, label: 'Selecciona "Agregar a inicio"', desc: 'Desplázate hacia abajo en el menú y busca "Añadir a pantalla de inicio"' },
    { icon: CheckCircle2, label: '¡Listo! Abre WAXAPP', desc: 'Encontrarás el ícono de WAXAPP en tu pantalla de inicio' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-20 max-w-lg">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ backgroundColor: '#0A0A0A', boxShadow: '0 0 30px rgba(0,230,118,0.4)' }}
          >
            <img src="/waxapp-icon.svg" alt="WAXAPP" className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Instala WAXAPP</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Accede más rápido a tus productos favoritos y recibe ofertas exclusivas.
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs gap-1">
              <Smartphone className="h-3 w-3" /> PWA
            </Badge>
            {swReady && (
              <Badge variant="outline" className="text-xs gap-1" style={{ borderColor: '#00E676', color: '#00E676' }}>
                <CheckCircle2 className="h-3 w-3" /> Service Worker activo
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Android / Desktop */}
        <AnimatePresence mode="wait">
          {(os === 'android' || os === 'desktop') && (
            <motion.div
              key="android"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <Chrome className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">
                    {os === 'android' ? 'Android' : 'Escritorio'}
                  </p>
                  <p className="text-xs text-muted-foreground">Chrome / Edge compatible</p>
                </div>
              </div>

              {installed ? (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.3)' }}
                >
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: '#00E676' }} />
                  <p className="font-medium text-foreground">¡App ya instalada!</p>
                  <p className="text-xs text-muted-foreground mt-1">Estás usando WAXAPP en modo app.</p>
                </div>
              ) : (
                <Button onClick={handleAndroidInstall} className="w-full gap-2" size="lg">
                  <ArrowDown className="h-4 w-4" />
                  Instalar App en tu Celular
                </Button>
              )}
            </motion.div>
          )}

          {/* iOS */}
          {os === 'ios' && (
            <motion.div
              key="ios"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-5"
            >
              <p className="text-sm font-semibold text-foreground">Cómo instalar en iPhone / iPad</p>
              <ol className="space-y-4">
                {iosSteps.map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="flex items-start gap-4"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{ backgroundColor: 'rgba(0,230,118,0.12)', color: '#00E676' }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <step.icon className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-foreground text-sm">{step.label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>

              {/* Animación visual Safari share button */}
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/30 py-3 text-sm text-muted-foreground"
              >
                <Share className="h-4 w-4" />
                <span>Busca este ícono en Safari</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notificaciones Push */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {notificationsEnabled
                ? <Bell className="h-5 w-5" style={{ color: '#00E676' }} />
                : <BellOff className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="font-semibold text-foreground text-sm">
                  🔔 Alertas y Promociones en tiempo real
                </p>
                <p className="text-xs text-muted-foreground">
                  {notificationsEnabled
                    ? 'Activo — recibirás notificaciones de WAXAPP'
                    : 'Activa para recibir ofertas exclusivas y novedades'}
                </p>
              </div>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleToggleNotifications}
              disabled={notifLoading}
              aria-label="Activar notificaciones push"
            />
          </div>

          {notificationsEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-lg p-3 text-xs text-muted-foreground"
              style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.2)' }}
            >
              ✅ Recibirás alertas de: nuevos productos, ofertas flash, estado de tus pedidos y promociones exclusivas.
            </motion.div>
          )}
        </motion.div>

        {/* Beneficios */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-6 grid grid-cols-2 gap-3"
        >
          {[
            { emoji: '⚡', title: 'Más rápida', desc: 'Sin esperar que cargue el navegador' },
            { emoji: '📦', title: 'Tus pedidos', desc: 'Seguimiento en tiempo real' },
            { emoji: '🎁', title: 'Ofertas VIP', desc: 'Acceso anticipado a promociones' },
            { emoji: '📴', title: 'Sin internet', desc: 'Navega el catálogo sin conexión' },
          ].map((b) => (
            <div key={b.title} className="rounded-xl border border-border bg-card/60 p-4">
              <p className="text-2xl mb-1">{b.emoji}</p>
              <p className="text-sm font-semibold text-foreground">{b.title}</p>
              <p className="text-xs text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Install;
