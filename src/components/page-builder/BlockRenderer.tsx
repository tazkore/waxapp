import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { PageBlock } from './blockTypes';

const ProductGridBlock = ({ data }: { data: any }) => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      let q = supabase.from('products').select('id,name,slug,price,image_url,category').eq('is_active', true);
      if (data.category) q = q.eq('category', data.category);
      if (data.onlyFeatured) q = q.eq('is_featured', true);
      const { data: rows } = await q.limit(data.limit ?? 8);
      setItems(rows ?? []);
    })();
  }, [data.category, data.limit, data.onlyFeatured]);

  return (
    <section className="py-12 px-4 max-w-7xl mx-auto">
      {data.title && <h2 className="text-3xl font-bold text-foreground mb-8 text-center">{data.title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p) => (
          <Link key={p.id} to={`/producto/${p.slug ?? p.id}`} className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition">
            {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="w-full aspect-square object-cover group-hover:scale-105 transition" />}
            <div className="p-3">
              <h3 className="font-medium text-foreground text-sm line-clamp-2">{p.name}</h3>
              <p className="text-primary font-bold mt-1">${Number(p.price).toLocaleString('es-MX')}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
};

const BlockRenderer = ({ block }: { block: PageBlock }) => {
  const { type, data } = block;

  switch (type) {
    case 'hero':
      return (
        <section
          className={`relative py-20 px-4 ${data.imageUrl ? 'bg-cover bg-center' : 'bg-gradient-to-br from-primary/10 via-background to-accent/10'}`}
          style={data.imageUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url(${data.imageUrl})` } : {}}
        >
          <div className={`max-w-4xl mx-auto text-${data.align ?? 'center'}`}>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">{data.title}</h1>
            {data.subtitle && <p className="text-lg md:text-xl text-muted-foreground mb-6">{data.subtitle}</p>}
            {data.ctaText && (
              <Button asChild size="lg"><Link to={data.ctaUrl || '/'}>{data.ctaText}</Link></Button>
            )}
          </div>
        </section>
      );

    case 'text':
      return (
        <section className="py-8 px-4 max-w-3xl mx-auto">
          <div className={`text-${data.align ?? 'left'} text-foreground whitespace-pre-wrap leading-relaxed`}>
            {data.content}
          </div>
        </section>
      );

    case 'image':
      const widthCls = data.width === 'medium' ? 'max-w-2xl' : data.width === 'wide' ? 'max-w-5xl' : 'max-w-7xl';
      return (
        <figure className={`${widthCls} mx-auto px-4 py-6`}>
          {data.url && <img src={data.url} alt={data.alt || ''} loading="lazy" className="w-full rounded-lg" />}
          {data.caption && <figcaption className="text-center text-sm text-muted-foreground mt-2">{data.caption}</figcaption>}
        </figure>
      );

    case 'productGrid':
      return <ProductGridBlock data={data} />;

    case 'banner':
      return (
        <section className="py-12 px-4">
          <div
            className="max-w-6xl mx-auto rounded-2xl p-8 md:p-12 text-center"
            style={{ background: data.bgColor, color: data.textColor }}
          >
            <h2 className="text-2xl md:text-4xl font-bold mb-2">{data.title}</h2>
            {data.subtitle && <p className="opacity-90 mb-6">{data.subtitle}</p>}
            {data.ctaText && (
              <Button asChild variant="secondary"><Link to={data.ctaUrl || '/'}>{data.ctaText}</Link></Button>
            )}
          </div>
        </section>
      );

    case 'faq':
      return (
        <section className="py-12 px-4 max-w-3xl mx-auto">
          {data.title && <h2 className="text-3xl font-bold text-foreground mb-6 text-center">{data.title}</h2>}
          <Accordion type="single" collapsible className="w-full">
            {(data.items ?? []).map((it: any, i: number) => (
              <AccordionItem key={i} value={`i-${i}`}>
                <AccordionTrigger>{it.q}</AccordionTrigger>
                <AccordionContent>{it.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      );

    case 'cta':
      return (
        <section className="py-16 px-4 bg-primary/5">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{data.title}</h2>
            {data.subtitle && <p className="text-muted-foreground mb-6">{data.subtitle}</p>}
            {data.ctaText && (
              <Button asChild size="lg"><Link to={data.ctaUrl || '/'}>{data.ctaText}</Link></Button>
            )}
          </div>
        </section>
      );

    case 'columns':
      const cols = data.columns ?? [];
      const grid = cols.length === 2 ? 'md:grid-cols-2' : cols.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';
      return (
        <section className="py-12 px-4 max-w-6xl mx-auto">
          <div className={`grid grid-cols-1 ${grid} gap-6`}>
            {cols.map((c: any, i: number) => (
              <div key={i} className="p-6 bg-card border border-border rounded-lg">
                {c.title && <h3 className="font-semibold text-foreground mb-2">{c.title}</h3>}
                {c.text && <p className="text-muted-foreground text-sm whitespace-pre-wrap">{c.text}</p>}
              </div>
            ))}
          </div>
        </section>
      );

    case 'spacer':
      const sz = { sm: 'h-6', md: 'h-12', lg: 'h-24', xl: 'h-40' }[data.size as string] ?? 'h-12';
      return <div className={sz} />;

    case 'video':
      const embed = getEmbedUrl(data.url);
      return (
        <section className="py-8 px-4 max-w-4xl mx-auto">
          {embed && (
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe src={embed} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          )}
          {data.caption && <p className="text-center text-sm text-muted-foreground mt-2">{data.caption}</p>}
        </section>
      );

    default:
      return null;
  }
};

export default BlockRenderer;
