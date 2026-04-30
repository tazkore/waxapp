import { useEffect, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { LEGAL_DOCS, type LegalKey } from '@/lib/legalContent';

interface Props {
  docKey: LegalKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted?: (key: LegalKey) => void;
}

const LegalModal = ({ docKey, open, onOpenChange, onAccepted }: Props) => {
  const [agreed, setAgreed] = useState(false);
  const doc = docKey ? LEGAL_DOCS[docKey] : null;

  useEffect(() => {
    setAgreed(false);
  }, [docKey, open]);

  if (!doc) return null;

  const handleAccept = () => {
    localStorage.setItem(
      doc.storageKey,
      JSON.stringify({ accepted: true, at: new Date().toISOString() })
    );
    onAccepted?.(doc.key);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-foreground">{doc.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {doc.intro}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[50vh] pr-4 -mr-4 my-2">
          <div className="space-y-5">
            {doc.sections.map((s) => (
              <section key={s.heading}>
                <h4 className="text-sm font-semibold text-foreground mb-1.5">
                  {s.heading}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-start gap-2 pt-2 border-t border-border">
          <Checkbox
            id={`agree-${doc.key}`}
            checked={agreed}
            onCheckedChange={(v) => setAgreed(Boolean(v))}
            className="mt-0.5"
          />
          <label
            htmlFor={`agree-${doc.key}`}
            className="text-sm text-muted-foreground leading-snug cursor-pointer"
          >
            He leído y acepto este documento. Confirmo ser mayor de 18 años.
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button
            disabled={!agreed}
            onClick={handleAccept}
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:neon-glow disabled:opacity-50"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Aceptar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LegalModal;
