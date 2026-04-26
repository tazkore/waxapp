import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, CheckCircle2, AlertCircle, Crop as CropIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { optimizeImage, buildStoragePath, publicUrl } from '@/lib/imageOptimizer';
import ImageCropDialog from './ImageCropDialog';

interface Props {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  folder?: string;
  /** Callback opcional cuando se suben varias imágenes en lote (no rompe API existente) */
  onBatchComplete?: (urls: string[]) => void;
}

type QueueStatus = 'pending' | 'converting' | 'cropping' | 'optimizing' | 'uploading' | 'done' | 'error' | 'skipped';

interface QueueItem {
  id: string;
  name: string;
  size: number;
  status: QueueStatus;
  message?: string;
  url?: string;
  before?: number;
  after?: number;
}

const formatKB = (b: number) => (b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`);

const STATUS_LABEL: Record<QueueStatus, string> = {
  pending: 'En cola',
  converting: 'Convirtiendo HEIC',
  cropping: 'Esperando recorte',
  optimizing: 'Optimizando',
  uploading: 'Subiendo',
  done: 'Listo',
  error: 'Error',
  skipped: 'Omitido',
};

const isHeic = (f: File) => {
  const n = f.name.toLowerCase();
  return f.type === 'image/heic' || f.type === 'image/heif' || n.endsWith('.heic') || n.endsWith('.heif');
};

const convertHeic = async (f: File): Promise<File> => {
  const { default: heic2any } = await import('heic2any');
  const blob = (await heic2any({ blob: f, toType: 'image/jpeg', quality: 0.92 })) as Blob;
  const newName = f.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], newName, { type: 'image/jpeg' });
};

const ImageUploadInput = ({
  value,
  onChange,
  placeholder = 'https://... o sube una imagen',
  folder = 'pages',
  onBatchComplete,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<{ before: number; after: number } | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // Resolver del diálogo de recorte (para integrar con la cola async)
  const cropResolverRef = useRef<((file: File | null) => void) | null>(null);
  const { toast } = useToast();

  const updateItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  // Espera a que el usuario recorte (o cancele) en el diálogo
  const waitForCrop = (file: File): Promise<File | null> =>
    new Promise((resolve) => {
      cropResolverRef.current = resolve;
      setPendingFile(file);
    });

  const uploadOne = async (file: File, id: string): Promise<string | null> => {
    updateItem(id, { status: 'optimizing' });
    const { full, thumb, originalSize, finalSize } = await optimizeImage(file);
    const paths = buildStoragePath(folder, file.name);
    const isOptimized = file.type !== 'image/svg+xml' && file.type !== 'image/gif';
    const contentType = isOptimized ? 'image/webp' : file.type;

    updateItem(id, { status: 'uploading' });
    const [r1] = await Promise.all([
      supabase.storage.from('media').upload(paths.full, full, { cacheControl: '3600', contentType }),
      supabase.storage.from('media').upload(paths.thumb, thumb, { cacheControl: '3600', contentType }),
    ]);
    if (r1.error) throw r1.error;

    const url = publicUrl(paths.full);
    updateItem(id, { status: 'done', url, before: originalSize, after: finalSize });
    return url;
  };

  const processQueue = async (files: File[]) => {
    const items: QueueItem[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name || 'imagen',
      size: f.size,
      status: 'pending',
    }));
    setQueue(items);

    const successUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = items[i].id;

      // Validaciones
      const heic = isHeic(file);
      if (!heic && file.type && !file.type.startsWith('image/')) {
        updateItem(id, { status: 'error', message: 'Tipo no válido' });
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        updateItem(id, { status: 'error', message: 'Mayor de 25MB' });
        continue;
      }

      try {
        let working = file;

        // 1. HEIC → JPEG
        if (heic) {
          updateItem(id, { status: 'converting' });
          working = await convertHeic(file);
        }

        // 2. SVG/GIF: subida directa (sin recorte)
        if (working.type === 'image/svg+xml' || working.type === 'image/gif') {
          const url = await uploadOne(working, id);
          if (url) {
            successUrls.push(url);
            onChange(url);
          }
          continue;
        }

        // 3. Recorte interactivo
        updateItem(id, { status: 'cropping' });
        const cropped = await waitForCrop(working);
        if (!cropped) {
          updateItem(id, { status: 'skipped', message: 'Recorte cancelado' });
          continue;
        }

        // 4. Optimizar + subir
        const url = await uploadOne(cropped, id);
        if (url) {
          successUrls.push(url);
          onChange(url);
          setStats({ before: items[i].before ?? 0, after: items[i].after ?? 0 });
        }
      } catch (e: any) {
        updateItem(id, { status: 'error', message: e?.message ?? 'Error inesperado' });
      }
    }

    // Resumen
    const ok = successUrls.length;
    const fail = files.length - ok;
    toast({
      title: `Lote completado: ${ok}/${files.length}`,
      description: fail > 0 ? `${fail} con error o canceladas.` : 'Todas las imágenes se subieron.',
      variant: fail > 0 ? 'destructive' : 'default',
    });
    onBatchComplete?.(successUrls);
  };

  const onCropConfirm = (cropped: File) => {
    setPendingFile(null);
    cropResolverRef.current?.(cropped);
    cropResolverRef.current = null;
  };
  const onCropCancel = () => {
    setPendingFile(null);
    cropResolverRef.current?.(null);
    cropResolverRef.current = null;
  };

  const isWorking = queue.some((q) => ['pending', 'converting', 'cropping', 'optimizing', 'uploading'].includes(q.status));
  const totalDone = queue.filter((q) => q.status === 'done').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1" />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={isWorking}
          title="Subir imagen(es) — selección múltiple soportada"
        >
          {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" size="icon" variant="ghost" onClick={() => { onChange(''); setStats(null); }} title="Quitar">
            <X className="h-4 w-4" />
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/*,.heic,.heif,.webp"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) processQueue(files);
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

      {/* Panel de progreso por imagen */}
      {queue.length > 0 && (
        <div
          className="rounded border border-border bg-muted/30 divide-y divide-border max-h-64 overflow-auto"
          role="status"
          aria-live="polite"
          aria-label={`Progreso de subida: ${totalDone} de ${queue.length}`}
        >
          <div className="px-3 py-2 flex items-center justify-between text-xs bg-muted/50">
            <span className="font-medium">
              Procesando {queue.length} imagen{queue.length === 1 ? '' : 'es'} — {totalDone} listas
            </span>
            {!isWorking && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setQueue([])} className="h-6 text-xs">
                Limpiar
              </Button>
            )}
          </div>
          {queue.map((it) => {
            const Icon =
              it.status === 'done' ? CheckCircle2 :
              it.status === 'error' || it.status === 'skipped' ? AlertCircle :
              it.status === 'cropping' ? CropIcon :
              Loader2;
            const iconClass =
              it.status === 'done' ? 'text-green-500' :
              it.status === 'error' ? 'text-destructive' :
              it.status === 'skipped' ? 'text-muted-foreground' :
              it.status === 'cropping' ? 'text-primary' :
              'text-muted-foreground animate-spin';

            return (
              <div key={it.id} className="px-3 py-2 flex items-center gap-3 text-xs">
                <Icon className={`h-4 w-4 flex-shrink-0 ${iconClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{it.name}</div>
                  <div className="text-muted-foreground">
                    {formatKB(it.size)} · {STATUS_LABEL[it.status]}
                    {it.message && ` — ${it.message}`}
                    {it.before && it.after && ` · ${formatKB(it.before)} → ${formatKB(it.after)}`}
                  </div>
                </div>
                {it.url && (
                  <img src={it.url} alt="" className="h-8 w-8 object-cover rounded border border-border flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <ImageCropDialog
        open={!!pendingFile}
        file={pendingFile}
        onCancel={onCropCancel}
        onConfirm={onCropConfirm}
      />
    </div>
  );
};

export default ImageUploadInput;
