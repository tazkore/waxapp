import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
}

interface AddressFields {
  address: string;
  city: string;
  state: string;
  postalCode: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (fields: AddressFields) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const AddressAutocomplete = ({ value, onChange, onSelect, placeholder = 'Calle y número', className, disabled }: Props) => {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    debounce(async (q: string) => {
      if (q.length < 5) { setSuggestions([]); setOpen(false); return; }
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Mexico')}&format=json&countrycodes=mx&limit=5&addressdetails=1&accept-language=es`;
        const r = await fetch(url, {
          headers: { 'User-Agent': 'WAXAPP/1.0 contact@waxapp.mx' },
        });
        if (!r.ok) return;
        const data: NominatimResult[] = await r.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        // Nominatim failed silently — user can type manually
      } finally {
        setLoading(false);
      }
    }, 600),
    []
  );

  useEffect(() => {
    search(value);
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (result: NominatimResult) => {
    const a = result.address;
    const street = [a.road, a.house_number].filter(Boolean).join(' ');
    const city = a.city || a.town || a.village || '';
    const state = a.state || '';
    const postalCode = a.postcode || '';
    const displayAddress = street || result.display_name.split(',')[0];

    onChange(displayAddress);
    onSelect({ address: displayAddress, city, state, postalCode });
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-9 ${className ?? ''}`}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {suggestions.map(s => (
            <button
              key={s.place_id}
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0"
              onMouseDown={() => handleSelect(s)}
            >
              <span className="font-medium text-foreground">{s.display_name.split(',')[0]}</span>
              <span className="block text-xs text-muted-foreground truncate mt-0.5">
                {s.display_name.split(',').slice(1, 4).join(',').trim()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
