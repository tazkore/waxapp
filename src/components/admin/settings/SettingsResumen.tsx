import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageCircle, CreditCard, Truck, Globe, Users, Palette, FileText, Languages, Code, ListChecks } from 'lucide-react';

interface Props {
  onNavigate: (k: string) => void;
}

const cards = [
  { key: 'com-contacto', label: 'Información de contacto', icon: FileText, desc: 'Razón social, RFC, teléfono, redes.' },
  { key: 'com-whatsapp', label: 'Botón de WhatsApp', icon: MessageCircle, desc: 'Configura el botón flotante.' },
  { key: 'com-emails', label: 'E-mails automáticos', icon: Mail, desc: 'Plantillas de bienvenida, pedido, envío.' },
  { key: 'co-options', label: 'Opciones del checkout', icon: CreditCard, desc: 'Campos requeridos, mínimo, edad.' },
  { key: 'co-messages', label: 'Mensajes del checkout', icon: FileText, desc: 'Header, footer y agradecimiento.' },
  { key: 'pagos-metodos', label: 'Métodos de pago', icon: CreditCard, desc: 'Pasarelas activas y comisiones.' },
  { key: 'pagos-envios', label: 'Medios de envío', icon: Truck, desc: 'Paqueterías y zonas.' },
  { key: 'otros-dominios', label: 'Dominios', icon: Globe, desc: 'Vincula tus dominios.' },
  { key: 'otros-usuarios', label: 'Usuarios y staff', icon: Users, desc: 'Roles y permisos.' },
  { key: 'otros-locale', label: 'Idiomas y monedas', icon: Languages, desc: 'Localización del sitio.' },
  { key: 'otros-codigos', label: 'Códigos externos', icon: Code, desc: 'GA4, Pixel, GTM, scripts.' },
  { key: 'otros-custom', label: 'Campos personalizados', icon: ListChecks, desc: 'Atributos extensibles.' },
];

const SettingsResumen = ({ onNavigate }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {cards.map((c) => {
      const Icon = c.icon;
      return (
        <Card
          key={c.key}
          onClick={() => onNavigate(c.key)}
          className="bg-card border-border hover:border-primary/40 cursor-pointer transition"
        >
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base text-foreground">{c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default SettingsResumen;
