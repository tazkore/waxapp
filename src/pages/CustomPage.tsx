import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BlockRenderer from '@/components/page-builder/BlockRenderer';
import NotFound from './NotFound';
import { Loader2 } from 'lucide-react';

const CustomPage = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      setPage(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!page) return <NotFound />;

  const blocks = Array.isArray(page.blocks) ? page.blocks : [];

  return (
    <>
      <Helmet>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
        <link rel="canonical" href={`${window.location.origin}/${page.slug}`} />
      </Helmet>
      <Navbar />
      <main className="min-h-screen">
        {blocks.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            <h1 className="text-3xl font-bold text-foreground mb-2">{page.title}</h1>
            <p>Esta página aún no tiene contenido.</p>
          </div>
        ) : (
          blocks.map((b: any) => <BlockRenderer key={b.id} block={b} />)
        )}
      </main>
      <Footer />
    </>
  );
};

export default CustomPage;
