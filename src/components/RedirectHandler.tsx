import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica si la ruta actual tiene un redirect 301 configurado en seo_redirects
 * y, de ser así, navega a la ruta destino reemplazando el historial (replace: true)
 * para emular un 301 en el contexto de un SPA.
 *
 * Nota: Un verdadero 301 HTTP requiere configuración a nivel de hosting/CDN.
 * Esta solución a nivel de cliente preserva la experiencia y evita 404s,
 * y los crawlers modernos (Googlebot) ejecutan JS y siguen el `replace`.
 * Para SEO máximo, además se actualiza el canonical via useSeoMeta sobre la nueva URL.
 */
const RedirectHandler = () => {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data, error } = await supabase
        .from('seo_redirects')
        .select('id, to_path, status_code, hit_count')
        .eq('from_path', pathname)
        .eq('is_active', true)
        .maybeSingle();

      if (cancelled || error || !data) return;

      // Incrementa contador (best-effort, ignora errores)
      supabase
        .from('seo_redirects')
        .update({
          hit_count: (data.hit_count || 0) + 1,
          last_hit_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .then(() => {});

      // Navega preservando query y hash
      navigate(`${data.to_path}${search}${hash}`, { replace: true });
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, search, hash, navigate]);

  return null;
};

export default RedirectHandler;
