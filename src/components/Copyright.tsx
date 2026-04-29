const Copyright = ({ className = "" }: { className?: string }) => (
  <p className={`text-center text-xs text-muted-foreground ${className}`}>
    © WAXAPP<span className="text-primary">.</span>MX {new Date().getFullYear()} · Hecho con ciencia.
  </p>
);

export default Copyright;
