import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ImageIcon, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  query: { name: string; brand?: string; category?: string; gtin?: string };
  current?: string | null;
  onPick: (url: string) => void;
  size?: "sm" | "icon";
  /** Open the picker dialog immediately on mount (and call onClose when closed) */
  defaultOpen?: boolean;
  /** Hide the trigger button entirely (useful when controlling via defaultOpen) */
  hideTrigger?: boolean;
  onClose?: () => void;
}

const AutoImagePicker = ({ query, current, onPick, size = "sm", defaultOpen = false, hideTrigger = false, onClose }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [source, setSource] = useState<string>("");

  // Auto-search on mount when defaultOpen is set
  React.useEffect(() => {
    if (defaultOpen && !images.length && !busy) {
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) onClose?.();
  };

  const search = async () => {
    setBusy(true);
    setImages([]);
    try {
      const { data, error } = await supabase.functions.invoke("find-product-image", {
        body: { ...query, count: 5 },
      });
      if (error || data?.error) throw new Error(data?.error?.message || error?.message || "Error");
      setImages(data.images || []);
      setSource(data.source || "");
      if (!data.images?.length) {
        toast({ title: "Sin resultados", description: "Intenta refinar el nombre o marca." });
      }
    } catch (e: any) {
      toast({ title: "Error buscando imagen", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openDialog = () => {
    setOpen(true);
    if (!images.length) search();
  };

  return (
    <>
      <Button
        type="button"
        size={size === "icon" ? "icon" : "sm"}
        variant={current ? "ghost" : "outline"}
        onClick={openDialog}
        className="gap-1"
        title="Buscar imagen automáticamente"
      >
        {size === "icon" ? <Sparkles className="h-4 w-4" /> : (
          <>
            <Sparkles className="h-3.5 w-3.5" /> {current ? "Cambiar" : "Buscar imagen"}
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Imágenes para "{query.name}"
              {source && <Badge variant="outline" className="text-[10px] ml-2">{source}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {busy ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Buscando...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      onPick(url);
                      setOpen(false);
                      toast({ title: "Imagen asignada" });
                    }}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors bg-muted"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                    />
                    <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Check className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </button>
                ))}
                {!images.length && (
                  <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                    No hay imágenes. Prueba refinar el nombre.
                  </p>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={search} disabled={busy}>
                  Buscar de nuevo
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AutoImagePicker;
