import { useRef, useState, useCallback, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Crop as CropIcon, RotateCcw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mínimos en píxeles reales de la imagen original
const MIN_REAL_PX = 64;
// Mínimo en píxeles del área seleccionada (en coords del display)
const MIN_DISPLAY_PX = 20;

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
  const [tooSmall, setTooSmall] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  // Cache de la última previsualización dibujada (evita repintar si el área no cambió)
  const lastDrawRef = useRef<{ src: string; key: string } | null>(null);
  const { toast } = useToast();

  // Limita el área de recorte a los bordes de la imagen mostrada
  const clampCrop = useCallback((c: Crop): Crop => {
    const img = imgRef.current;
    if (!img || c.unit !== 'px') return c;
    const W = img.width;
    const H = img.height;
    let x = Math.max(0, Math.min(c.x, W));
    let y = Math.max(0, Math.min(c.y, H));
    let w = Math.max(MIN_DISPLAY_PX, Math.min(c.width, W - x));
    let h = Math.max(MIN_DISPLAY_PX, Math.min(c.height, H - y));
    // Si tras el clamp se sale, reposicionamos
    if (x + w > W) x = Math.max(0, W - w);
    if (y + h > H) y = Math.max(0, H - h);
    return { ...c, x, y, width: w, height: h };
  }, []);

  // Cargar src cuando llega/cambia el file (limpiando estado previo)
  useEffect(() => {
    setSrc('');
    setCrop(undefined);
    setCompleted(null);
    lastDrawRef.current = null;
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

  // Dibuja vista previa del recorte en el canvas
  useEffect(() => {
    const canvas = previewRef.current;
    const image = imgRef.current;
    if (!canvas || !image || !completed || completed.width < 2 || completed.height < 2) {
      setPreviewSize(null);
      setTooSmall(false);
      return;
    }
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const realW = Math.round(completed.width * scaleX);
    const realH = Math.round(completed.height * scaleY);

    setTooSmall(realW < MIN_REAL_PX || realH < MIN_REAL_PX);

    // Cache: si el área dibujada es la misma que la última, no repintamos
    const key = `${Math.round(completed.x)}|${Math.round(completed.y)}|${Math.round(completed.width)}|${Math.round(completed.height)}`;
    const cached = lastDrawRef.current;
    if (cached && cached.src === src && cached.key === key) {
      // Ya está dibujado; solo aseguramos el state visible
      setPreviewSize({ w: realW, h: realH });
      return;
    }

    // Limitamos el canvas mostrado a 240px de ancho/alto manteniendo proporción
    const max = 240;
    const ratio = Math.min(max / realW, max / realH, 1);
    canvas.width = Math.max(1, Math.round(realW * ratio));
    canvas.height = Math.max(1, Math.round(realH * ratio));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      image,
      completed.x * scaleX,
      completed.y * scaleY,
      completed.width * scaleX,
      completed.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    lastDrawRef.current = { src, key };
    setPreviewSize({ w: realW, h: realH });
  }, [completed, src]);

  const handleConfirm = async () => {
    if (!file) return;
    if (!completed || !imgRef.current) {
      // Sin recorte → devolver original
      onConfirm(file);
      reset();
      return;
    }
    if (tooSmall) {
      toast({
        title: 'Área demasiado pequeña',
        description: `El recorte debe medir al menos ${MIN_REAL_PX}×${MIN_REAL_PX} px en la imagen original.`,
        variant: 'destructive',
      });
      return;
    }
    // Saneamos el área final dentro de los límites de la imagen
    const img = imgRef.current;
    const safe: PixelCrop = {
      unit: 'px',
      x: Math.max(0, Math.min(completed.x, img.width)),
      y: Math.max(0, Math.min(completed.y, img.height)),
      width: Math.min(completed.width, img.width - Math.max(0, completed.x)),
      height: Math.min(completed.height, img.height - Math.max(0, completed.y)),
    };

    // Validación final: el área debe estar dentro de la imagen y coincidir con la preview
    if (safe.width < 2 || safe.height < 2) {
      toast({ title: 'Recorte inválido', description: 'El área seleccionada está vacía.', variant: 'destructive' });
      return;
    }
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const expectedW = Math.round(safe.width * scaleX);
    const expectedH = Math.round(safe.height * scaleY);

    if (previewSize && (Math.abs(previewSize.w - expectedW) > 1 || Math.abs(previewSize.h - expectedH) > 1)) {
      toast({
        title: 'Vista previa desincronizada',
        description: `Preview ${previewSize.w}×${previewSize.h} ≠ calculado ${expectedW}×${expectedH}. Ajusta de nuevo el área.`,
        variant: 'destructive',
      });
      return;
    }

    const cropped = await getCroppedFile(img, safe, file.name, file.type);
    toast({
      title: '✂️ Recorte aplicado',
      description: `Imagen recortada a ${expectedW}×${expectedH} px. Subiendo y optimizando…`,
    });
    onConfirm(cropped);
    reset();
  };

  const reset = () => {
    setSrc('');
    setCrop(undefined);
    setCompleted(null);
    setAspect(undefined);
    setPreviewSize(null);
    setTooSmall(false);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  // Auto-focus cuando abre o cuando hay un recorte válido listo
  useEffect(() => {
    if (open && previewSize && !tooSmall) {
      // Pequeño delay para esperar a que el dialog termine de animar
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open, previewSize, tooSmall]);

  // Atajos de teclado: Ctrl/Cmd+Enter aplica, Esc lo gestiona el Dialog
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!tooSmall) handleConfirm();
    }
  };

  const previewAria = !previewSize
    ? 'Sin área de recorte definida. Arrastra los bordes sobre la imagen para seleccionar.'
    : tooSmall
      ? `Área seleccionada de ${previewSize.w} por ${previewSize.h} píxeles. Demasiado pequeña, mínimo ${MIN_REAL_PX} por ${MIN_REAL_PX}.`
      : `Vista previa lista: ${previewSize.w} por ${previewSize.h} píxeles. Pulsa Control Enter para aplicar.`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-3xl" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" /> Recortar imagen
          </DialogTitle>
          <DialogDescription>
            Define el encuadre. Atajos: <kbd className="px-1 rounded border border-border bg-muted/50 text-[10px]">Ctrl</kbd>+
            <kbd className="px-1 rounded border border-border bg-muted/50 text-[10px]">Enter</kbd> para aplicar,{' '}
            <kbd className="px-1 rounded border border-border bg-muted/50 text-[10px]">Esc</kbd> para cancelar.
          </DialogDescription>
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
                onChange={(c) => setCrop(clampCrop(c))}
                onComplete={(c) => setCompleted(clampCrop(c) as PixelCrop)}
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

          <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
            <p className="text-xs text-muted-foreground">
              Arrastra los bordes para definir el área. Después se optimizará a WebP automáticamente.
            </p>
            <div className="flex flex-col items-center gap-1" role="region" aria-label="Vista previa del recorte">
              <Label className="text-xs text-muted-foreground" id="crop-preview-label">Vista previa</Label>
              <div
                className="bg-muted/30 border border-border rounded p-2 flex items-center justify-center"
                style={{ width: 256, height: 256 }}
                aria-labelledby="crop-preview-label"
              >
                <canvas
                  ref={previewRef}
                  className="max-w-full max-h-full rounded shadow-sm"
                  style={{ imageRendering: 'auto', display: previewSize ? 'block' : 'none' }}
                  aria-hidden="true"
                />
                {!previewSize && (
                  <span className="text-[11px] text-muted-foreground text-center px-2">
                    Define un área de recorte para ver la vista previa
                  </span>
                )}
              </div>
              {previewSize && (
                <span className={`text-[11px] ${tooSmall ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {previewSize.w} × {previewSize.h} px
                </span>
              )}
              {/* Mensaje accesible para lectores de pantalla */}
              <span className="sr-only" aria-live="polite" aria-atomic="true">
                {previewAria}
              </span>
            </div>
          </div>

          {tooSmall && (
            <div className="flex items-start gap-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                El área seleccionada es muy pequeña. Selecciona al menos {MIN_REAL_PX}×{MIN_REAL_PX} px de la imagen original
                para conservar la calidad.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => handleAspectChange(aspect)}>
            <RotateCcw className="h-4 w-4 mr-2" /> Restablecer
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirm}
            disabled={tooSmall}
            aria-label={tooSmall ? 'Aplicar deshabilitado: área demasiado pequeña' : 'Aplicar recorte y subir imagen'}
          >
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
