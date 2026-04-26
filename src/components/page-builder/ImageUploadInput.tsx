import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  folder?: string;
}

const ImageUploadInput = ({ value, onChange, placeholder = 'https://... o sube una imagen', folder = 'pages' }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return toast({ title: 'Archivo inválido', description: 'Selecciona una imagen.', variant: 'destructive' });
    }
    if (file.size > 8 * 1024 * 1024) {
      return toast({ title: 'Imagen muy grande', description: 'Máximo 8MB.', variant: 'destructive' });
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
      onChange(pub.publicUrl);
      toast({ title: '✅ Imagen subida' });
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
          title="Subir imagen"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange('')} title="Quitar">
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
        <img
          src={value}
          alt=""
          className="h-20 w-32 object-cover rounded border border-border"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}
    </div>
  );
};

export default ImageUploadInput;
