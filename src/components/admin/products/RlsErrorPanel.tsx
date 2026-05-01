import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ChevronDown, ChevronUp, Users } from "lucide-react";

interface Props {
  message: string;
  role: string | null;
  onGoToStaff?: () => void;
  isSuperAdmin?: boolean;
}

const RlsErrorPanel = ({ message, role, onGoToStaff, isSuperAdmin }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Alert variant="destructive" className="border-destructive/50">
      <ShieldAlert className="h-5 w-5" />
      <AlertTitle className="text-base">No tienes permisos para importar productos</AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p className="text-sm">
          Tu rol actual es <strong className="font-mono">{role || "sin rol asignado"}</strong>. Para
          insertar productos necesitas el rol <strong>admin</strong>, <strong>super_admin</strong> o{" "}
          <strong>moderator</strong>.
        </p>
        <p className="text-sm">
          <strong>Solución:</strong> pide a un super_admin que te asigne el rol adecuado en{" "}
          <em>Staff → Usuarios</em>. Tus productos extraídos siguen disponibles aquí — no se perderán.
        </p>
        <div className="flex gap-2 flex-wrap pt-1">
          {isSuperAdmin && onGoToStaff && (
            <Button size="sm" variant="outline" onClick={onGoToStaff} className="gap-2">
              <Users className="h-4 w-4" /> Ir a Staff
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} className="gap-1">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Detalles técnicos
          </Button>
        </div>
        {open && (
          <pre className="text-[11px] bg-background/40 p-2 rounded font-mono whitespace-pre-wrap break-all">
            {message}
          </pre>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default RlsErrorPanel;
