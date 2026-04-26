import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface RedirectRule {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  hit_count: number;
  is_wildcard: boolean;
  priority: number;
}

/**
 * Convierte un patrón con wildcards/params a una RegExp y devuelve una función
 * que aplica la sustitución sobre to_path.
 *
 * Sintaxis soportada en from_path:
 *   - `/old/*`            → captura todo lo que sigue como `*` (greedy)
 *   - `/blog/:slug`       → captura un segmento como `:slug`
 *   - `/a/:cat/b/:id`     → múltiples params nombrados
 *
 * Sustitución en to_path:
 *   - `*` se reemplaza con el contenido capturado por el wildcard
 *   - `:slug`, `:id`, etc. se reemplazan con el valor del param correspondiente
 */
const matchWildcard = (
  pattern: string,
  pathname: string,
): { matched: boolean; resolve: (toPath: string) => string } => {
  const paramNames: string[] = [];
  let hasStar = false;

  // Escape regex chars excepto los que vamos a reemplazar
  const regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    })
    .replace(/\*/g, () => {
      hasStar = true;
      return '(.*)';
    });

  const re = new RegExp(`^${regexStr}$`);
  const m = pathname.match(re);
  if (!m) return { matched: false, resolve: () => '' };

  const params: Record<string, string> = {};
  paramNames.forEach((n, i) => {
    params[n] = m[i + 1];
  });
  const starValue = hasStar ? m[m.length - 1] : '';

  return {
    matched: true,
    resolve: (toPath: string) => {
      let out = toPath.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) =>
        params[name] !== undefined ? params[name] : `:${name}`,
      );
      out = out.replace(/\*/g, starValue);
      return out;
    },
  };
};

const RedirectHandler = () => {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // 1) Match exacto (rápido, ya indexado)
      const exact = await supabase
        .from('seo_redirects')
        .select('id, from_path, to_path, status_code, hit_count, is_wildcard, priority')
        .eq('from_path', pathname)
        .eq('is_active', true)
        .eq('is_wildcard', false)
        .maybeSingle();

      if (cancelled) return;

      let match: { rule: RedirectRule; resolved: string } | null = null;

      if (exact.data) {
        const r = exact.data as RedirectRule;
        match = { rule: r, resolved: r.to_path };
      } else {
        // 2) Match wildcard: traer reglas wildcard activas y probar en orden de prioridad
        const { data: wildcards } = await supabase
          .from('seo_redirects')
          .select('id, from_path, to_path, status_code, hit_count, is_wildcard, priority')
          .eq('is_active', true)
          .eq('is_wildcard', true)
          .order('priority', { ascending: false });

        if (cancelled || !wildcards) return;

        for (const r of wildcards as RedirectRule[]) {
          const { matched, resolve } = matchWildcard(r.from_path, pathname);
          if (matched) {
            const resolved = resolve(r.to_path);
            if (resolved !== pathname) {
              match = { rule: r, resolved };
              break;
            }
          }
        }
      }

      if (!match) return;

      // Incrementa contador (best-effort)
      supabase
        .from('seo_redirects')
        .update({
          hit_count: (match.rule.hit_count || 0) + 1,
          last_hit_at: new Date().toISOString(),
        })
        .eq('id', match.rule.id)
        .then(() => {});

      navigate(`${match.resolved}${search}${hash}`, { replace: true });
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, search, hash, navigate]);

  return null;
};

export default RedirectHandler;
