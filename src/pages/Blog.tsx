import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar } from 'lucide-react';

interface Post {
  id: string; slug: string; title: string; excerpt: string | null;
  cover_image_url: string | null; category: string; published_at: string | null;
  author: string;
}

const CATEGORIES = ['todas', 'cbd', 'thc', 'edibles', 'nano', 'guias', 'general'];

const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('blog_posts')
        .select('id, slug, title, excerpt, cover_image_url, category, published_at, author')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      setPosts((data as Post[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'todas' ? posts : posts.filter((p) => p.category === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <header className="mb-12 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">Blog WAXAPP</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Guías, ciencia y novedades sobre CBD, THC, edibles y nano tecnología premium.
          </p>
        </header>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <Button key={c} variant={filter === c ? 'default' : 'outline'} size="sm" onClick={() => setFilter(c)} className="capitalize">
              {c}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">No hay artículos en esta categoría todavía.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`} className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all">
                <div className="aspect-video bg-muted overflow-hidden">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-background flex items-center justify-center">
                      <span className="font-display text-3xl text-primary/40">WAXAPP</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <Badge variant="outline" className="mb-2 capitalize">{p.category}</Badge>
                  <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{p.title}</h2>
                  {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>}
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {p.published_at && new Date(p.published_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    <span>·</span>
                    <span>{p.author}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
