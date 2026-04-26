import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Calendar, User } from 'lucide-react';

interface Post {
  id: string; slug: string; title: string; excerpt: string | null; content: string;
  cover_image_url: string | null; author: string; category: string;
  meta_title: string | null; meta_description: string | null; keywords: string[];
  og_image_url: string | null; published_at: string | null;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Post[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
      const p = data as Post | null;
      setPost(p);

      if (p) {
        // dynamic SEO
        document.title = p.meta_title || p.title;
        const setMeta = (name: string, content: string | null, attr = 'name') => {
          let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
          if (!content) { el?.remove(); return; }
          if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
          el.setAttribute('content', content);
        };
        setMeta('description', p.meta_description || p.excerpt);
        setMeta('keywords', p.keywords?.length ? p.keywords.join(', ') : null);
        setMeta('og:title', p.meta_title || p.title, 'property');
        setMeta('og:description', p.meta_description || p.excerpt, 'property');
        setMeta('og:type', 'article', 'property');
        setMeta('og:image', p.og_image_url || p.cover_image_url, 'property');

        // increment views (best-effort, ignore RLS error)
        supabase.from('blog_posts').update({ views: undefined }).eq('id', p.id);

        // related
        const { data: rel } = await supabase.from('blog_posts').select('*')
          .eq('status', 'published').eq('category', p.category).neq('id', p.id).limit(3);
        setRelated((rel as Post[]) ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!post) return (
    <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto py-32 text-center"><h1 className="text-3xl font-bold">Artículo no encontrado</h1><Link to="/blog" className="text-primary mt-4 inline-block">← Volver al blog</Link></div><Footer /></div>
  );

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.title, description: post.meta_description || post.excerpt,
    image: post.cover_image_url, author: { '@type': 'Organization', name: post.author },
    datePublished: post.published_at, publisher: { '@type': 'Organization', name: 'WAXAPP' },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Blog
        </Link>
        <Badge variant="outline" className="capitalize mb-3">{post.category}</Badge>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight">{post.title}</h1>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {post.author}</span>
          {post.published_at && (
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />
              {new Date(post.published_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={post.title} className="mt-8 w-full rounded-xl border border-border" />
        )}
        <div className="prose prose-invert mt-10 max-w-none prose-headings:font-display prose-a:text-primary">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>

      {related.length > 0 && (
        <section className="container mx-auto px-4 py-12 max-w-5xl border-t border-border">
          <h2 className="font-display text-2xl font-bold mb-6">Artículos relacionados</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {related.map((r) => (
              <Link key={r.id} to={`/blog/${r.slug}`} className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors">
                <Badge variant="outline" className="mb-2 capitalize">{r.category}</Badge>
                <h3 className="font-semibold text-foreground">{r.title}</h3>
                {r.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.excerpt}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
      <Footer />
    </div>
  );
};

export default BlogPost;
