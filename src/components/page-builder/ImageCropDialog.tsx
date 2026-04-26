import { useRef, useState, useCallback, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Crop as CropIcon, RotateCcw } from 'lucide-react';

interface Props {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: 'Libre', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '21:9', value: 21 / 9 },
  { label: '9:16', value: 9 / 16 },
];

const centerInitial = (w: number, h: number, aspect?: number): Crop => {
  if (!aspect) return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, w, h), w, h);
};

const ImageCropDialog = ({ open, file, onCancel, onConfirm }: Props) => {
  const [src, setSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  // Cargar src cuando llega/cambia el file (limpiando estado previo)
  useEffect(() => {
    setSrc('');
    setCrop(undefined);
    setCompleted(null);
    if (!file) return;

    let cancelled = false;
    const reader = new FileReader();
    reader.onload = () => {
      if (!cancelled) setSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    return () => {
      cancelled = true;
      reader.abort();
    };
  }, [file]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerInitial(width, height, aspect));
  }, [aspect]);

  const handleAspectChange = (a: number | undefined) => {
    setAspect(a);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerInitial(width, height, a));
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    if (!completed || !imgRef.current) {
      // Sin recorte → devolver original
      onConfirm(file);
      reset();
      return;
    }
    const cropped = await getCroppedFile(imgRef.current, completed, file.name, file.type);
    onConfirm(cropped);
    reset();
  };

  const reset = () => {
    setSrc('');
    setCrop(undefined);
    setCompleted(null);
    setAspect(undefined);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" /> Recortar imagen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Proporción</Label>
            <div className="flex flex-wrap gap-2">
              {ASPECTS.map((a) => (
                <Button
                  key={a.label}
                  type="button"
                  size="sm"
                  variant={aspect === a.value ? 'default' : 'outline'}
                  onClick={() => handleAspectChange(a.value)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center bg-muted/30 rounded border border-border max-h-[60vh] overflow-auto p-2">
            {src && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompleted(c)}
                aspect={aspect}
                keepSelection
              >
                <img
                  ref={imgRef}
                  src={src}
                  alt="Recortar"
                  onLoad={onImageLoad}
                  style={{ maxHeight: '55vh', maxWidth: '100%' }}
                />
              </ReactCrop>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Arrastra los bordes para definir el área. Después se optimizará a WebP automáticamente.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => handleAspectChange(aspect)}>
            <RotateCcw className="h-4 w-4 mr-2" /> Restablecer
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            <CropIcon className="h-4 w-4 mr-2" /> Aplicar y subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

async function getCroppedFile(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
  mimeType: string
): Promise<File> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(crop.width * scaleX);
  canvas.height = Math.round(crop.height * scaleY);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Conservamos el tipo original (la optimización posterior lo convierte a WebP)
  const outType = mimeType === 'image/svg+xml' || mimeType === 'image/gif' ? 'image/png' : mimeType;
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas vacío'))), outType, 0.95)
  );
  return new File([blob], fileName, { type: outType });
}

export default ImageCropDialog;
