import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Globe, ShoppingBag, Store } from 'lucide-react';

interface ChannelsSectionProps {
  onNavigate?: (key: string) => void;
}

const channels = [
  { id: 'web', name: 'Tienda Online', description: 'Tu sitio público en WAXAPP.', icon: Globe, status: 'active', target: 'theme' },
  { id: 'amazon', name: 'Amazon Seller', description: 'Sincroniza catálogo y pedidos con Amazon.', icon: ShoppingBag, status: 'optional', target: 'amazon' },
  { id: 'mercadolibre', name: 'Mercado Libre', description: 'Próximamente: publica en MELI desde aquí.', icon: Store, status: 'soon', target: 'integrations' },
];

const ChannelsSection = ({ onNavigate }: ChannelsSectionProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" /> Canales de venta
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Centraliza dónde vendes: tu sitio, marketplaces y redes sociales.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.id} className="bg-card border-border hover:border-primary/40 transition">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base text-foreground">{c.name}</CardTitle>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {c.status === 'active' ? 'Activo' : c.status === 'soon' ? 'Próximamente' : 'Opcional'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground min-h-[40px]">{c.description}</p>
                <Button
                  size="sm"
                  variant={c.status === 'soon' ? 'outline' : 'default'}
                  disabled={c.status === 'soon'}
                  className="w-full"
                  onClick={() => onNavigate?.(c.target)}
                >
                  {c.status === 'soon' ? 'No disponible' : 'Configurar'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ChannelsSection;
