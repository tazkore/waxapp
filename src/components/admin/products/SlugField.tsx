import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

interface Props {
  name: string;
  value: string | null;
  onChange: (v: string) => void;
  excludeId?: string;
}

const SlugField = ({ name, value, onChange, excludeId }: Props) => {
  const [checking, setChecking] = useState(false);
  const [collision, setCollision] = useState(false);
  const current = value || slugify(name || "");

  // Auto-fill when user hasn't typed slug yet
  useEffect(() => {
    if (!value && name) onChange(slugify(name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setChecking(true);
      let q = supabase.from("products").select("id").eq("slug", current).limit(1);
      if (excludeId) q = q.neq("id", excludeId);
      const { data } = await q;
      if (!cancelled) {
        setCollision(!!(data && data.length > 0));
        setChecking(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [current, excludeId]);

  const fixCollision = async () => {
    let suggestion = current;
    let n = 2;
    let exists = true;
    while (exists && n < 100) {
      suggestion = `${slugify(name)}-${n++}`;
      let q = supabase.from("products").select("id").eq("slug", suggestion).limit(1);
      if (excludeId) q = q.neq("id", excludeId);
      const { data } = await q;
      exists = !!(data && data.length > 0);
    }
    onChange(suggestion);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-2">
        Slug (URL)
        {checking && <Loader2 className="h-3 w-3 animate-spin" />}
        {!checking && current && !collision && <CheckCircle2 className="h-3 w-3 text-primary" />}
        {!checking && collision && (
          <Badge
            variant="outline"
            className="text-[10px] text-destructive border-destructive/40 cursor-pointer"
            onClick={fixCollision}
          >
            <AlertCircle className="h-3 w-3 mr-1" /> Slug en uso · Corregir
          </Badge>
        )}
      </Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={slugify(name)} />
      <p className="text-[10px] text-muted-foreground truncate">
        URL pública: <span className="text-foreground">/producto/{current || "…"}</span>
      </p>
    </div>
  );
};

export default SlugField;
