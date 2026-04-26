import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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

  // SEO meta via DOM (sin helmet)
  useEffect(() => {
    if (!page) return;
    const prevTitle = document.title;
    document.title = page.meta_title || page.title;
    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      if (!content) return;
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attr, name); document.head.appendChild(tag); }
      tag.setAttribute('content', content);
    };
    if (page.meta_description) setMeta('description', page.meta_description);
    if (page.og_image_url) setMeta('og:image', page.og_image_url, 'property');
    return () => { document.title = prevTitle; };
  }, [page]);

  return (
    <>
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
