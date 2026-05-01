import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import SettingsResumen from './SettingsResumen';
import SettingsContact from './SettingsContact';
import SettingsWhatsApp from './SettingsWhatsApp';
import SettingsEmails from './SettingsEmails';
import SettingsCheckoutOptions from './SettingsCheckoutOptions';
import SettingsCheckoutMessages from './SettingsCheckoutMessages';
import SettingsExternalCodes from './SettingsExternalCodes';
import SettingsLocale from './SettingsLocale';
import SettingsRedirects from './SettingsRedirects';
import SettingsCustomFields from './SettingsCustomFields';
import PaymentsSection from '../PaymentsSection';
import ShippingSection from '../ShippingSection';
import WarehousesSection from '../WarehousesSection';
import StaffSection from '../StaffSection';
import DomainsSection from '../DomainsSection';

type SubKey =
  | 'resumen'
  | 'pagos-metodos' | 'pagos-envios' | 'pagos-cd'
  | 'com-contacto' | 'com-whatsapp' | 'com-emails'
  | 'co-options' | 'co-messages'
  | 'otros-usuarios' | 'otros-dominios' | 'otros-codigos' | 'otros-locale' | 'otros-redirects' | 'otros-custom';

const NAV: Array<{ group: string; items: Array<{ key: SubKey; label: string }> }> = [
  { group: 'General', items: [{ key: 'resumen', label: 'Resumen' }] },
  {
    group: 'Pagos y envíos',
    items: [
      { key: 'pagos-metodos', label: 'Métodos de pago' },
      { key: 'pagos-envios', label: 'Medios de envío' },
      { key: 'pagos-cd', label: 'Centros de distribución' },
    ],
  },
  {
    group: 'Comunicación',
    items: [
      { key: 'com-contacto', label: 'Información de contacto' },
      { key: 'com-whatsapp', label: 'Botón de WhatsApp' },
      { key: 'com-emails', label: 'E-mails automáticos' },
    ],
  },
  {
    group: 'Checkout',
    items: [
      { key: 'co-options', label: 'Opciones del checkout' },
      { key: 'co-messages', label: 'Mensajes para clientes' },
    ],
  },
  {
    group: 'Otros',
    items: [
      { key: 'otros-usuarios', label: 'Usuarios y notificaciones' },
      { key: 'otros-dominios', label: 'Dominios' },
      { key: 'otros-codigos', label: 'Códigos externos' },
      { key: 'otros-locale', label: 'Idiomas y monedas' },
      { key: 'otros-redirects', label: 'Redireccionamientos 301' },
      { key: 'otros-custom', label: 'Campos personalizados' },
    ],
  },
];

const SettingsLayout = () => {
  const [active, setActive] = useState<SubKey>('resumen');

  useEffect(() => {
    const fromHash = (window.location.hash.replace('#settings/', '') || 'resumen') as SubKey;
    if (NAV.some((g) => g.items.some((i) => i.key === fromHash))) setActive(fromHash);
  }, []);

  const go = (k: SubKey) => {
    setActive(k);
    window.history.replaceState(null, '', `#settings/${k}`);
  };

  const renderRight = () => {
    switch (active) {
      case 'resumen': return <SettingsResumen onNavigate={go as (k: string) => void} />;
      case 'pagos-metodos': return <PaymentsSection />;
      case 'pagos-envios': return <ShippingSection />;
      case 'pagos-cd': return <WarehousesSection />;
      case 'com-contacto': return <SettingsContact />;
      case 'com-whatsapp': return <SettingsWhatsApp />;
      case 'com-emails': return <SettingsEmails />;
      case 'co-options': return <SettingsCheckoutOptions />;
      case 'co-messages': return <SettingsCheckoutMessages />;
      case 'otros-usuarios': return <StaffSection />;
      case 'otros-dominios': return <DomainsSection />;
      case 'otros-codigos': return <SettingsExternalCodes />;
      case 'otros-locale': return <SettingsLocale />;
      case 'otros-redirects': return <SettingsRedirects />;
      case 'otros-custom': return <SettingsCustomFields />;
      default: return <SettingsResumen onNavigate={go as (k: string) => void} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración general</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Centro de control de tu tienda: contacto, comunicación, checkout, monedas y más.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <Card className="bg-card border-border h-fit lg:sticky lg:top-4">
          <CardContent className="p-3 space-y-4">
            {NAV.map((group) => (
              <div key={group.group} className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 pt-2">
                  {group.group}
                </div>
                {group.items.map((it) => (
                  <button
                    key={it.key}
                    onClick={() => go(it.key)}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition ${
                      active === it.key
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="min-w-0">{renderRight()}</div>
      </div>
    </div>
  );
};

export default SettingsLayout;
