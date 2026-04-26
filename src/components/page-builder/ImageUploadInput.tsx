import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { optimizeImage, buildStoragePath, publicUrl } from '@/lib/imageOptimizer';

interface Props {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  folder?: string;
}

const formatKB = (b: number) => (b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`);

const ImageUploadInput = ({ value, onChange, placeholder = 'https://... o sube una imagen', folder = 'pages' }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<{ before: number; after: number } | null>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return toast({ title: 'Archivo inválido', description: 'Selecciona una imagen.', variant: 'destructive' });
    }
    if (file.size > 25 * 1024 * 1024) {
      return toast({ title: 'Imagen muy grande', description: 'Máximo 25MB (se comprimirá automáticamente).', variant: 'destructive' });
    }
    setUploading(true);
    setStats(null);
    try {
      // Compresión client-side a WebP + thumbnail
      const { full, thumb, originalSize, finalSize } = await optimizeImage(file);
      const paths = buildStoragePath(folder, file.name);
      const isOptimized = file.type !== 'image/svg+xml' && file.type !== 'image/gif';
      const contentType = isOptimized ? 'image/webp' : file.type;

      const [r1] = await Promise.all([
        supabase.storage.from('media').upload(paths.full, full, { cacheControl: '3600', contentType }),
        supabase.storage.from('media').upload(paths.thumb, thumb, { cacheControl: '3600', contentType }),
      ]);
      if (r1.error) throw r1.error;

      onChange(publicUrl(paths.full));
      setStats({ before: originalSize, after: finalSize });
      const saved = Math.max(0, Math.round((1 - finalSize / originalSize) * 100));
      toast({
        title: '✅ Imagen subida y optimizada',
        description: isOptimized ? `${formatKB(originalSize)} → ${formatKB(finalSize)} (${saved}% menos)` : 'Subida sin cambios (formato vectorial).',
      });
    } catch (e: any) {
      toast({ title: 'Error al subir', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1" />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Subir imagen (se comprime automáticamente)"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" size="icon" variant="ghost" onClick={() => { onChange(''); setStats(null); }} title="Quitar">
            <X className="h-4 w-4" />
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
      {value && (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt=""
            className="h-20 w-32 object-cover rounded border border-border"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
          {stats && (
            <p className="text-xs text-muted-foreground">
              Optimizado: <span className="text-foreground font-medium">{formatKB(stats.before)} → {formatKB(stats.after)}</span>
              <br />
              Convertido a WebP, máx 1600px
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploadInput;
