import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, X, Eye, Trash2, History } from "lucide-react";

interface Job {
  id: string;
  source_url: string;
  status: string;
  urls_found: number;
  products_extracted: number;
  products_imported: number;
  error: string | null;
  discovered_urls: string[] | null;
  extracted_products: any[] | null;
  created_at: string;
  updated_at: string;
}

const STATUS_VARIANT: Record<string, string> = {
  pending: "border-amber-500/40 text-amber-500",
  scraping: "border-primary/40 text-primary",
  extracting: "border-primary/40 text-primary",
  completed: "border-primary/40 text-primary",
  failed: "border-destructive/40 text-destructive",
  cancelled: "border-muted-foreground/40 text-muted-foreground",
};

interface Props {
  refreshKey?: number;
}

const ImportJobsHistory = ({ refreshKey }: Props) => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Job | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("import_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast({ title: "Error al cargar historial", description: error.message, variant: "destructive" });
    setJobs((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const retry = async (job: Job) => {
    if (!job.discovered_urls?.length) {
      toast({ title: "Sin URLs para reintentar", variant: "destructive" });
      return;
    }
    setBusy(job.id);
    try {
      await supabase.from("import_jobs").update({ status: "pending", error: null }).eq("id", job.id);
      const { data, error } = await supabase.functions.invoke("firecrawl-scrape-products", {
        body: { urls: job.discovered_urls, job_id: job.id, provider: "readability", use_ai: true },
      });
      if (error || data?.error) throw new Error(data?.error?.message || error?.message || "Error");
      toast({ title: "Reintento OK", description: `${data.extracted ?? 0} productos extraídos` });
      load();
    } catch (e: any) {
      toast({ title: "Reintento falló", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (job: Job) => {
    setBusy(job.id);
    await supabase.from("import_jobs").update({ status: "cancelled" }).eq("id", job.id);
    setBusy(null);
    load();
  };

  const remove = async (job: Job) => {
    if (!confirm("¿Eliminar este registro de importación?")) return;
    setBusy(job.id);
    await supabase.from("import_jobs").delete().eq("id", job.id);
    setBusy(null);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <History className="h-4 w-4" /> {jobs.length} importaciones
        </h3>
        <Button variant="ghost" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-3 w-3" /> Recargar
        </Button>
      </div>

      {jobs.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Aún no hay importaciones registradas.
          </CardContent>
        </Card>
      )}

      {jobs.map((job) => (
        <Card key={job.id}>
          <CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground truncate">
                  {job.source_url || "(sin URL)"}
                </p>
                <Badge variant="outline" className={STATUS_VARIANT[job.status] || "text-xs"}>
                  {job.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(job.created_at).toLocaleString()} · {job.urls_found} URLs ·{" "}
                {job.products_extracted} extraídos · {job.products_imported} importados
              </p>
              {job.error && <p className="text-xs text-destructive mt-1 truncate">{job.error}</p>}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewing(job)}
                disabled={!job.extracted_products?.length}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {(job.status === "failed" || job.status === "cancelled") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => retry(job)}
                  disabled={busy === job.id}
                >
                  {busy === job.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
              {(job.status === "scraping" || job.status === "pending") && (
                <Button variant="ghost" size="sm" onClick={() => cancel(job)} disabled={busy === job.id}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => remove(job)} disabled={busy === job.id}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {viewing && (
        <Dialog open onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Productos extraídos — {viewing.products_extracted}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {(viewing.extracted_products ?? []).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ${p.price ?? "?"} · {p.source_url}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ImportJobsHistory;
