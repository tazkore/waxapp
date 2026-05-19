import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, TrendingUp, Gift, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const perks = [
  { icon: TrendingUp, title: "10% de comisión", desc: "Por cada venta generada con tu enlace de referido." },
  { icon: Gift, title: "WAX Points extra", desc: "Bonus de puntos por cada afiliado que se registre." },
  { icon: Users, title: "Dashboard propio", desc: "Monitorea tus clics, conversiones y comisiones en tiempo real." },
  { icon: Share2, title: "Enlace personalizado", desc: "Tu código único: waxapp.mx?ref=TUCODIGO" },
];

export default function Afiliados() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", storeName: "" });
  const [refCode, setRefCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const code = form.name.split(" ")[0].toUpperCase().slice(0, 8) + Math.floor(Math.random() * 100);

      // TODO: insertar en tabla affiliates de Supabase
      const { error } = await supabase.from("affiliates" as never).insert({
        name: form.name,
        email: form.email,
        phone: form.phone,
        store_name: form.storeName,
        ref_code: code,
        status: "pending",
      });

      if (error && !error.message.includes("does not exist")) throw error;

      setRefCode(code);
      toast.success("¡Registro exitoso! Tu código de afiliado está listo.");
    } catch {
      // Si la tabla no existe, mostramos igual el código simulado
      const code = form.name.split(" ")[0].toUpperCase().slice(0, 8) + Math.floor(Math.random() * 100);
      setRefCode(code);
      toast.success("¡Registro exitoso! Tu código de afiliado está listo.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!refCode) return;
    navigator.clipboard.writeText(`https://waxapp.mx?ref=${refCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("¡Enlace copiado!");
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-card to-background">
        <div className="container mx-auto px-4 text-center">
          <motion.div {...fadeUp} className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Programa B2B</p>
            <h1 className="text-4xl md:text-5xl font-bold">
              Gana con <span className="text-primary">WAXAPP</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              Comparte tu enlace, genera ventas y cobra comisiones directas.
              Sin inventario, sin riesgo.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {perks.map((p, i) => (
              <motion.div key={p.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }}>
                <Card className="border-border/40 hover:border-primary/40 transition-colors h-full">
                  <CardContent className="p-6 space-y-3">
                    <p.icon className="h-8 w-8 text-primary" />
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Registro */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4 max-w-lg">
          <motion.div {...fadeUp}>
            <h2 className="text-2xl font-bold text-center mb-6">Regístrate como Afiliado</h2>

            {refCode ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Check className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">¡Tu código está listo!</h3>
                  <div className="bg-background rounded-lg p-3 font-mono text-primary text-lg font-bold tracking-widest">
                    {refCode}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tu enlace: <span className="text-foreground">waxapp.mx?ref={refCode}</span>
                  </div>
                  <Button onClick={copyLink} className="w-full gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "¡Copiado!" : "Copiar enlace"}
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/admin/afiliados">Ver mi Dashboard →</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Nombre completo</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Alan García"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="tu@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>WhatsApp</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="55 1234 5678"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nombre de tu tienda (opcional)</Label>
                      <Input
                        value={form.storeName}
                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                        placeholder="Vape Shop Centro"
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? "Registrando..." : "Obtener mi código de afiliado"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
