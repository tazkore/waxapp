import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, FileText, Headphones, CreditCard, Mail, ShoppingBag, BarChart3, MessageCircle, Puzzle, Download, Settings2 } from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  envios: Truck,
  facturacion: FileText,
  soporte: Headphones,
  pagos: CreditCard,
  payments: CreditCard,
  email: Mail,
  marketplace: ShoppingBag,
  analytics: BarChart3,
  marketing: BarChart3,
  mensajeria: MessageCircle,
  messaging: MessageCircle,
  other: Puzzle,
};

interface AppCardData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  category: string;
  is_installed: boolean;
  is_active: boolean;
  version: string | null;
}

interface Props {
  app: AppCardData;
  onConnect: () => void;
  onConfigure: () => void;
}

const AppStoreCard = ({ app, onConnect, onConfigure }: Props) => {
  const Icon = ICONS[app.category] || Puzzle;
  const status = app.is_active ? 'active' : app.is_installed ? 'inactive' : 'disconnected';

  return (
    <Card className="bg-card border-border hover:border-primary/40 transition-all group relative overflow-hidden">
      {/* status badge top-right */}
      <div className="absolute top-3 right-3">
        {status === 'active' && (
          <Badge className="bg-primary/15 text-primary border-primary/30 gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
            Activo
          </Badge>
        )}
        {status === 'inactive' && (
          <Badge variant="secondary" className="text-muted-foreground">Inactivo</Badge>
        )}
        {status === 'disconnected' && (
          <Badge variant="outline" className="text-muted-foreground border-border">Desconectado</Badge>
        )}
      </div>

      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-3">
          <div
            className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 transition-shadow ${
              app.is_active ? 'bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.2)]' : 'bg-muted'
            }`}
          >
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="h-7 w-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <Icon className={`h-6 w-6 ${app.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-16">
            <h3 className="font-semibold text-sm text-foreground truncate">{app.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{app.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-[10px] text-muted-foreground capitalize">{app.category} · v{app.version || '1.0'}</span>
          {app.is_installed ? (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              onClick={onConfigure}
            >
              <Settings2 className="h-3 w-3" /> Configurar
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-shadow hover:shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
              onClick={onConnect}
            >
              <Download className="h-3 w-3" /> Instalar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AppStoreCard;
