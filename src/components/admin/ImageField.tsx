import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, ImageIcon, X, FolderOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImage, buildStoragePath, publicUrl } from '@/lib/imageOptimizer';
import { toast } from 'sonner';
import MediaPickerDialog from './MediaPickerDialog';

interface ImageFieldProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder?: 'products' | 'brands' | 'banners' | 'brand' | 'misc';
  size?: 'sm' | 'md';
  label?: string;
}

const ImageField = ({ value, onChange, folder = 'products', size = 'md', label }: ImageFieldProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { full, thumb } = await optimizeImage(file);
      const paths = buildStoragePath(folder, file.name);
      const [r1] = await Promise.all([
        supabase.storage.from('media').upload(paths.full, full, { cacheControl: '3600', contentType: 'image/webp' }),
        supabase.storage.from('media').upload(paths.thumb, thumb, { cacheControl: '3600', contentType: 'image/webp' }),
      ]);
      if (r1.error) throw r1.error;
      onChange(publicUrl(paths.full));
      toast.success('Imagen subida');
    } catch (err: any) {
      toast.error(err.message ?? 'Error al subir');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const dim = size === 'sm' ? 'h-12 w-12' : 'h-24 w-24';

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-medium text-foreground">{label}</label>}
      <div className="flex items-center gap-3">
        <div className={`${dim} rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0 relative`}>
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-8 text-xs gap-1">
            <Upload className="h-3 w-3" /> {value ? 'Cambiar' : 'Subir'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)} className="h-8 text-xs gap-1">
            <FolderOpen className="h-3 w-3" /> Galería
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} className="h-8 text-xs gap-1 text-destructive hover:text-destructive">
              <X className="h-3 w-3" /> Quitar
            </Button>
          )}
        </div>
      </div>
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => onChange(url)}
        defaultFolder={folder}
      />
    </div>
  );
};

export default ImageField;
