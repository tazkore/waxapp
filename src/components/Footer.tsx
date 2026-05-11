const Footer = () => (
  <footer className="border-t border-border bg-card py-10">
    <div className="container mx-auto px-4">
      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <div>
          <span className="font-display text-lg font-bold text-foreground">
            WAXAPP<span className="text-primary">.</span>MX
          </span>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Los productos son suplementos de bienestar. Consulta a un profesional de salud antes de su uso. No es un medicamento.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <a href="#legal" className="hover:text-foreground">Aviso Legal</a>
          <a href="#" className="hover:text-foreground">Política de Privacidad</a>
          <a href="#" className="hover:text-foreground">Términos de Uso</a>
          <a href="/afiliados" className="hover:text-primary text-primary/80">Programa de Afiliados</a>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded border border-border px-2 py-1">VISA</span>
          <span className="rounded border border-border px-2 py-1">MC</span>
          <span className="rounded border border-border px-2 py-1">SPEI</span>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        © WAXAPP<span className="text-primary">.</span>MX {new Date().getFullYear()} · Hecho con ciencia.
      </p>
    </div>
  </footer>
);

export default Footer;
