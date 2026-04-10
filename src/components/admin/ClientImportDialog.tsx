import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, Contact, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

type ImportRow = { name: string; email: string; phone?: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type ImportStep = 'select' | 'preview' | 'result';

const parseCSV = (text: string): ImportRow[] => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

  const nameIdx = headers.findIndex(h => /^(nombre|name|full.?name|contact)/.test(h));
  const emailIdx = headers.findIndex(h => /^(email|correo|e-mail|mail)/.test(h));
  const phoneIdx = headers.findIndex(h => /^(tel|phone|celular|móvil|movil|teléfono|telefono)/.test(h));

  if (nameIdx === -1 && emailIdx === -1) return [];

  return lines.slice(1).map(line => {
    const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim());
    return {
      name: cols[nameIdx] || '',
      email: cols[emailIdx] || '',
      phone: phoneIdx >= 0 ? cols[phoneIdx] || undefined : undefined,
    };
  }).filter(r => r.name || r.email);
};

const parseXLSX = (buffer: ArrayBuffer): ImportRow[] => {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (!json.length) return [];

  const findKey = (obj: Record<string, unknown>, patterns: RegExp[]) =>
    Object.keys(obj).find(k => patterns.some(p => p.test(k.toLowerCase())));

  const sample = json[0];
  const nameKey = findKey(sample, [/^(nombre|name|full.?name|contact)/]);
  const emailKey = findKey(sample, [/^(email|correo|e-mail|mail)/]);
  const phoneKey = findKey(sample, [/^(tel|phone|celular|móvil|movil|teléfono|telefono)/]);

  if (!nameKey && !emailKey) return [];

  return json.map(row => ({
    name: String(nameKey ? row[nameKey] ?? '' : ''),
    email: String(emailKey ? row[emailKey] ?? '' : ''),
    phone: phoneKey ? String(row[phoneKey] ?? '') || undefined : undefined,
  })).filter(r => r.name || r.email);
};

const parseVCF = (text: string): ImportRow[] => {
  const cards = text.split('BEGIN:VCARD').filter(c => c.includes('END:VCARD'));
  return cards.map(card => {
    const lines = card.split(/\r?\n/);
    let name = '';
    let email = '';
    let phone = '';
    for (const line of lines) {
      if (line.startsWith('FN:') || line.startsWith('FN;')) {
        name = line.replace(/^FN[^:]*:/, '').trim();
      } else if (line.toUpperCase().startsWith('EMAIL')) {
        email = line.replace(/^EMAIL[^:]*:/i, '').trim();
      } else if (line.toUpperCase().startsWith('TEL')) {
        phone = line.replace(/^TEL[^:]*:/i, '').trim();
      }
    }
    return { name, email, phone: phone || undefined };
  }).filter(r => r.name || r.email);
};

const ClientImportDialog = ({ open, onOpenChange, onImported }: Props) => {
  const [step, setStep] = useState<ImportStep>('select');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState({ success: 0, skipped: 0, errors: 0 });
  const [sourceType, setSourceType] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('select');
    setRows([]);
    setResult({ success: 0, skipped: 0, errors: 0 });
    setSourceType('');
  }, []);

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'csv' || ext === 'txt') {
        setSourceType('CSV');
        const text = await file.text();
        const parsed = parseCSV(text);
        if (!parsed.length) { toast({ title: 'Error', description: 'No se encontraron datos válidos. Asegúrate de que el archivo tenga columnas de nombre y email.', variant: 'destructive' }); return; }
        setRows(parsed);
        setStep('preview');
      } else if (ext === 'xlsx' || ext === 'xls') {
        setSourceType('Excel');
        const buffer = await file.arrayBuffer();
        const parsed = parseXLSX(buffer);
        if (!parsed.length) { toast({ title: 'Error', description: 'No se encontraron datos válidos. Asegúrate de que el archivo tenga columnas de nombre y email.', variant: 'destructive' }); return; }
        setRows(parsed);
        setStep('preview');
      } else if (ext === 'vcf') {
        setSourceType('Google Contacts');
        const text = await file.text();
        const parsed = parseVCF(text);
        if (!parsed.length) { toast({ title: 'Error', description: 'No se encontraron contactos en el archivo vCard.', variant: 'destructive' }); return; }
        setRows(parsed);
        setStep('preview');
      } else {
        toast({ title: 'Formato no soportado', description: 'Usa archivos .xlsx, .xls, .csv o .vcf', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error al leer archivo', description: 'El archivo no pudo ser procesado.', variant: 'destructive' });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0, skipped = 0, errors = 0;

    // Batch insert in chunks of 50
    const valid = rows.filter(r => r.name.trim() && r.email.trim());
    const invalid = rows.length - valid.length;
    skipped += invalid;

    for (let i = 0; i < valid.length; i += 50) {
      const chunk = valid.slice(i, i + 50).map(r => ({
        name: r.name.trim(),
        email: r.email.trim().toLowerCase(),
        phone: r.phone?.trim() || null,
        total_spent: 0,
        loyalty_points: 0,
        membership_tier: 'Bronze',
      }));

      const { data, error } = await supabase.from('clients').upsert(chunk, { onConflict: 'email', ignoreDuplicates: true }).select();
      if (error) {
        errors += chunk.length;
      } else {
        success += data?.length ?? 0;
        skipped += chunk.length - (data?.length ?? 0);
      }
    }

    setResult({ success, skipped, errors });
    setStep('result');
    setImporting(false);
    if (success > 0) onImported();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {step === 'select' && 'Importar Clientes'}
            {step === 'preview' && `Vista Previa — ${sourceType}`}
            {step === 'result' && 'Resultado de Importación'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4 py-4">
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-foreground font-medium">Arrastra un archivo aquí o haz clic para seleccionar</p>
              <p className="text-sm text-muted-foreground mt-1">Formatos soportados: .xlsx, .xls, .csv, .vcf</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.vcf"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { fileRef.current?.setAttribute('accept', '.xlsx,.xls'); fileRef.current?.click(); }}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <span className="text-sm font-medium text-foreground">Excel</span>
                <span className="text-xs text-muted-foreground">.xlsx, .xls</span>
              </button>
              <button
                onClick={() => { fileRef.current?.setAttribute('accept', '.csv,.txt'); fileRef.current?.click(); }}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <FileText className="h-8 w-8 text-blue-500" />
                <span className="text-sm font-medium text-foreground">CSV</span>
                <span className="text-xs text-muted-foreground">.csv (comas o punto y coma)</span>
              </button>
              <button
                onClick={() => { fileRef.current?.setAttribute('accept', '.vcf'); fileRef.current?.click(); }}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <Contact className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium text-foreground">Google Contacts</span>
                <span className="text-xs text-muted-foreground">.vcf (exportar desde Google)</span>
              </button>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">¿Cómo exportar de Google Contacts?</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Ve a <span className="text-primary">contacts.google.com</span></li>
                <li>Selecciona los contactos que deseas exportar</li>
                <li>Clic en <strong>Exportar</strong> → elige <strong>vCard (.vcf)</strong></li>
                <li>Sube el archivo .vcf aquí</li>
              </ol>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary">{rows.length} contactos encontrados</Badge>
              {rows.filter(r => !r.email.trim()).length > 0 && (
                <Badge variant="outline" className="border-destructive/30 text-destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {rows.filter(r => !r.email.trim()).length} sin email (se omitirán)
                </Badge>
              )}
            </div>
            <ScrollArea className="h-[300px] rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-muted-foreground w-8">#</TableHead>
                    <TableHead className="text-muted-foreground">Nombre</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Teléfono</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r, i) => (
                    <TableRow key={i} className={!r.name.trim() || !r.email.trim() ? 'opacity-50' : ''}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="text-foreground">{r.name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.email || <span className="text-destructive">sin email</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{r.phone || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 100 && (
                <p className="text-center text-xs text-muted-foreground py-2">... y {rows.length - 100} contactos más</p>
              )}
            </ScrollArea>
          </div>
        )}

        {step === 'result' && (
          <div className="py-6 space-y-4">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-lg font-semibold text-foreground">Importación Completada</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-2xl font-bold text-green-500">{result.success}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-2xl font-bold text-yellow-500">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Omitidos / Duplicados</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                <p className="text-xs text-muted-foreground">Errores</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={reset}>Volver</Button>
              <Button onClick={handleImport} disabled={importing} className="bg-primary text-primary-foreground">
                {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Importar {rows.filter(r => r.name.trim() && r.email.trim()).length} clientes
              </Button>
            </>
          )}
          {step === 'result' && (
            <Button onClick={() => handleClose(false)} className="bg-primary text-primary-foreground">Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientImportDialog;
