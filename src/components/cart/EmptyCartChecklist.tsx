import { Truck, ShieldCheck, BadgeCheck } from 'lucide-react';

const items = [
  { icon: Truck, text: 'Envío discreto a todo México' },
  { icon: ShieldCheck, text: 'Pago encriptado (Clip / SPEI)' },
  { icon: BadgeCheck, text: 'Productos legales y verificados' },
];

const EmptyCartChecklist = () => (
  <ul
    className="mx-auto w-full max-w-xs space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-left"
    aria-label="Beneficios de comprar en WAX"
  >
    {items.map(({ icon: Icon, text }) => (
      <li key={text} className="flex items-center gap-2 text-xs text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{text}</span>
      </li>
    ))}
  </ul>
);

export default EmptyCartChecklist;
