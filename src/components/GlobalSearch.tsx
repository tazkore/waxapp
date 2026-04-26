import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, Sparkles, Package, Newspaper, FileText, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type SearchResult = {
  type: 'product' | 'blog' | 'page';
  id: string;
  title: string;
  url: string;
  snippet?: string;
  price?: number;
  image?: string | null;
  category?: string;
};

const typeIcon = {
  product: Package,
  blog: Newspaper,
  page: FileText,
};

const typeLabel = {
  product: 'Producto',
  blog: 'Blog',
  page: 'Página',
};

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GlobalSearch = ({ open, onOpenChange }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setAnswer('');
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setAnswer('');
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('search-ai', {
          body: { query: query.trim() },
        });
        if (fnErr) throw fnErr;
        setResults(data?.results ?? []);
        setAnswer(data?.answer ?? '');
        if (data?.error) setError(data.error);
      } catch (e) {
        console.error(e);
        setError('No pudimos completar la búsqueda. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const go = (url: string) => {
    onOpenChange(false);
    if (url.startsWith('/')) navigate(url);
    else window.location.href = url;
  };

  // Render answer with [n] citations as clickable chips
  const renderAnswer = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((p, i) => {
      const m = p.match(/^\[(\d+)\]$/);
      if (m) {
        const idx = parseInt(m[1], 10) - 1;
        const r = results[idx];
        if (r) {
          return (
            <button
              key={i}
              onClick={() => go(r.url)}
              className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition"
            >
              {m[1]}
            </button>
          );
        }
      }
      return <span key={i}>{p}</span>;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca productos, artículos o páginas..."
            className="border-0 focus-visible:ring-0 px-0 text-base bg-transparent"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {query.trim().length < 2 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary opacity-60" />
              Busca con lenguaje natural. Por ejemplo: <em>"algo para dormir"</em> o <em>"vapes con CBD"</em>.
            </div>
          )}

          {error && (
            <div className="px-4 py-3 text-sm text-destructive bg-destructive/10 border-b border-border">
              {error}
            </div>
          )}

          {answer && (
            <div className="px-4 py-4 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-primary uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                Respuesta IA
              </div>
              <p className="text-sm text-foreground leading-relaxed">{renderAnswer(answer)}</p>
            </div>
          )}

          {results.length > 0 && (
            <ul className="divide-y divide-border">
              {results.map((r, idx) => {
                const Icon = typeIcon[r.type];
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      onClick={() => go(r.url)}
                      className="w-full flex gap-3 items-start px-4 py-3 hover:bg-muted/50 text-left transition"
                    >
                      <div className="shrink-0 mt-0.5 w-6 text-center text-xs font-semibold text-muted-foreground">
                        {idx + 1}
                      </div>
                      {r.type === 'product' && r.image ? (
                        <img
                          src={r.image}
                          alt={r.title}
                          className="h-12 w-12 rounded object-cover shrink-0 bg-muted"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground truncate">{r.title}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {typeLabel[r.type]}
                          </Badge>
                          {r.price != null && (
                            <span className="text-sm font-semibold text-primary">
                              ${Number(r.price).toLocaleString('es-MX')}
                            </span>
                          )}
                        </div>
                        {r.snippet && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.snippet}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No encontramos resultados para <strong>"{query}"</strong>.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
