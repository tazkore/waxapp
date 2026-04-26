import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Upload, ImageIcon, Check } from 'lucide-react';
import { optimizeImage, buildStoragePath, publicUrl } from '@/lib/imageOptimizer';
import { toast } from 'sonner';

interface MediaItem {
  name: string;
  path: string;
  url: string;
}

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (url: string) => void;
  defaultFolder?: 'products' | 'brands' | 'banners' | 'brand' | 'misc';
}

const FOLDERS: Array<{ key: string; label: string }> = [
  { key: 'products', label: 'Productos' },
  { key: 'brands', label: 'Marcas' },
  { key: 'brand', label: 'Branding' },
  { key: 'banners', label: 'Banners' },
  { key: 'misc', label: 'Otros' },
];

const MediaPickerDialog = ({ open, onOpenChange, onSelect, defaultFolder = 'products' }: MediaPickerDialogProps) => {
  const [folder, setFolder] = useState<string>(defaultFolder);
  const [files, setFiles] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.storage.from('media').list(folder, {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    const items: MediaItem[] = (data ?? [])
      .filter((d) => d.name && !d.name.startsWith('.') && !d.name.includes('-thumb.'))
      .map((d) => ({
        name: d.name,
        path: `${folder}/${d.name}`,
        url: publicUrl(`${folder}/${d.name}`),
      }));
    setFiles(items);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setSelected(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, folder]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || !list.length) return;
    setUploading(true);
    let firstUrl: string | null = null;
    for (const file of Array.from(list)) {
      try {
        const { full, thumb } = await optimizeImage(file);
        const paths = buildStoragePath(folder, file.name);
        const [u1] = await Promise.all([
          supabase.storage.from('media').upload(paths.full, full, { cacheControl: '3600', upsert: false, contentType: 'image/webp' }),
          supabase.storage.from('media').upload(paths.thumb, thumb, { cacheControl: '3600', upsert: false, contentType: 'image/webp' }),
        ]);
        if (u1.error) throw u1.error;
        if (!firstUrl) firstUrl = publicUrl(paths.full);
      } catch (err: any) {
        toast.error(err.message ?? 'Error al subir');
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    await load();
    if (firstUrl) setSelected(firstUrl);
  };

  const filtered = files.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle>Galería Multimedia</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {FOLDERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFolder(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                folder === f.key ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 h-9" />
          </div>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Subir
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay imágenes en esta carpeta.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setSelected(f.url)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition group ${
                    selected === f.url ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <img src={f.url} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
                  {selected === f.url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-[10px] text-white truncate">{f.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onSelect(selected);
                onOpenChange(false);
              }
            }}
          >
            Usar imagen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPickerDialog;
