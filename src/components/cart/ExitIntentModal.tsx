import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

const ExitIntentModal = ({ open, onOpenChange, onContinue }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-card border-border">
      <DialogHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Gift className="h-6 w-6 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl text-foreground">
          ¡Espera! Tu carrito está guardado
        </DialogTitle>
        <DialogDescription className="text-center">
          Finaliza ahora y llévate un <span className="text-primary font-semibold">regalo sorpresa</span> con tu pedido.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={onContinue} className="bg-primary text-primary-foreground hover:brightness-110">
          Continuar mi compra
        </Button>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Más tarde
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default ExitIntentModal;
