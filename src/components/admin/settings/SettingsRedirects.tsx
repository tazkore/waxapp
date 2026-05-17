import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Link2, Info, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  hit_count: number | null;
}

const SettingsRedirects = () => {
  const [items, setItems] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('seo_redirects')
      .select('id,from_path,to_path,status_code,is_active,hit_count')
      .order('hit_count', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setItems((data as Redirect[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Link2 className="h-5 w-5 text-primary" />
        <CardTitle className="text-foreground text-base">Redireccionamientos 301</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            Para crear o editar redireccionamientos, ve a{' '}
            <strong className="text-foreground">SEO &amp; Indexación → Redirects 301</strong>{' '}
            en la barra lateral del panel de administración.
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground">De</TableHead>
                  <TableHead className="text-muted-foreground">A</TableHead>
                  <TableHead className="text-muted-foreground w-20">Código</TableHead>
                  <TableHead className="text-muted-foreground w-20 text-right">Hits</TableHead>
                  <TableHead className="text-muted-foreground w-24">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell className="font-mono text-xs text-foreground">{r.from_path}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.to_path}</TableCell>
                    <TableCell className="text-muted-foreground">{r.status_code}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{r.hit_count ?? 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.is_active ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {r.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      Sin redireccionamientos configurados. Ve a SEO &amp; Indexación para crearlos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SettingsRedirects;
