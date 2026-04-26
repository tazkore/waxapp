import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, Copy, Trash2, Image as ImageIcon, Loader2, Search } from 'lucide-react';

interface MediaFile {
  name: string;
  path: string;
  url: string;
  size?: number;
  created_at?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const MediaSection = () => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState('products');
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const folders = ['products', 'brand', 'banners', 'misc'];
    const all: MediaFile[] = [];
    for (const f of folders) {
      const { data, error } = await supabase.storage.from('media').list(f, {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (!error && data) {
        data.filter(d => d.name && !d.name.startsWith('.')).forEach(d => {
          const path = `${f}/${d.name}`;
          all.push({
            name: d.name,
            path,
            url: `${SUPABASE_URL}/storage/v1/object/public/media/${path}`,
            size: (d.metadata as any)?.size,
            created_at: d.created_at,
          });
        });
      }
    }
    setFiles(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    let ok = 0, fail = 0;
    for (const file of Array.from(fileList)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
      const path = `${folder}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from('media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) { fail++; console.error(error); } else { ok++; }
    }
    setUploading(false);
    toast.success(`${ok} subida(s)${fail ? `, ${fail} con error` : ''}`);
    if (inputRef.current) inputRef.current.value = '';
    load();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada');
  };

  const remove = async (path: string) => {
    if (!confirm('¿Eliminar este archivo? No se puede deshacer.')) return;
    const { error } = await supabase.storage.from('media').remove([path]);
    if (error) { toast.error(error.message); return; }
    toast.success('Eliminado');
    load();
  };

  const filtered = files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.path.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Multimedia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Biblioteca de imágenes para productos, banners y branding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="products">Productos</option>
            <option value="brand">Branding</option>
            <option value="banners">Banners</option>
            <option value="misc">Otros</option>
          </select>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            id="media-upload"
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Subiendo...' : 'Subir imágenes'}
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o carpeta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay imágenes. Sube la primera.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((f) => (
            <Card key={f.path} className="overflow-hidden group">
              <div className="aspect-square bg-muted relative overflow-hidden">
                <img
                  src={f.url}
                  alt={f.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 space-y-2">
                <p className="text-xs truncate font-medium" title={f.name}>{f.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {f.path.split('/')[0]}
                </p>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => copyUrl(f.url)}>
                    <Copy className="h-3 w-3" /> URL
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => remove(f.path)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaSection;
