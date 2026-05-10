import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Minus, Plus, ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';
import { products } from '@/data/products';
import { useCartStore, ProductVariant } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import ProductJsonLd from '@/components/ProductJsonLd';
import { supabase } from '@/integrations/supabase/client';
import useCurrentSite from '@/hooks/useCurrentSite';
import { rewriteDescription } from '@/lib/seoVariant';
const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = products.find((p) => p.id === id);
  const addItem = useCartStore((s) => s.addItem);

  const [dbVariants, setDbVariants] = useState<ProductVariant[] | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>('benefits');

  // Fetch DB variants by matching product name
  useEffect(() => {
    if (!product) return;
    const fetch = async () => {
      const { data: dbProduct } = await supabase
        .from('products')
        .select('id, image_url')
        .eq('name', product.title)
        .maybeSingle();

      if (dbProduct) {
        setProductImage((dbProduct as any).image_url ?? null);
        const { data: variants } = await supabase
          .from('product_variants')
          .select('name, price, stock, image_url')
          .eq('product_id', dbProduct.id)
          .eq('is_active', true)
          .order('price');

        if (variants && variants.length > 0) {
          setDbVariants(variants.map((v: any) => ({ name: v.name, price: v.price })));
        }
      }
      setLoadingVariants(false);
    };
    fetch();
  }, [product]);

  // Resolve which variants to use: DB first, then static
  const activeVariants = dbVariants ?? product?.variants ?? [];

  // Set default selected variant once variants are resolved
  useEffect(() => {
    if (activeVariants.length > 0 && !selectedVariant) {
      setSelectedVariant(activeVariants[0].name);
    }
  }, [activeVariants, selectedVariant]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Producto no encontrado</h1>
          <Button variant="outline" onClick={() => navigate('/')}>Volver a la tienda</Button>
        </div>
      </div>
    );
  }

  const currentPrice = activeVariants.find((v) => v.name === selectedVariant)?.price ?? product.price;

  const handleAddToCart = () => {
    // Build product with resolved variants for cart
    const productWithVariants = { ...product, variants: activeVariants };
    addItem(productWithVariants, quantity, selectedVariant || undefined);
    toast.success(`${product.title} agregado al carrito`);
  };

  const accordionItems = [
    { key: 'benefits', title: 'Beneficios', content: product.benefits },
    { key: 'usage', title: 'Modo de Uso', content: product.usage },
    { key: 'legal', title: 'Legalidad', content: product.legal },
  ].filter((a) => a.content);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />
      <ProductJsonLd
        name={product.title}
        description={product.description}
        price={currentPrice}
        sku={product.id}
        availability="InStock"
      />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <Link to="/#tienda" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {/* Image Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="aspect-square rounded-xl border border-border bg-card flex items-center justify-center relative overflow-hidden group">
              {productImage ? (
                <img
                  src={productImage}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <span className="font-display text-4xl text-muted-foreground/20">WAXAPP</span>
              )}
              {product.badge && (
                <span className="absolute top-4 right-4 rounded-md bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  {product.badge}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square rounded-lg border border-border bg-card/50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <span className="text-xs text-muted-foreground/30">IMG {i}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {product.category}
              </span>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mt-2">
                {product.title}
              </h1>
              <p className="text-muted-foreground mt-3 leading-relaxed">{product.description}</p>
            </div>

            <div className="text-3xl font-bold text-foreground">
              ${currentPrice.toLocaleString()} <span className="text-base text-muted-foreground font-normal">MXN</span>
            </div>

            {/* Variants */}
            {loadingVariants ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando variantes...
              </div>
            ) : activeVariants.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Variante</label>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setSelectedVariant(v.name)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        selectedVariant === v.name
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-foreground/30'
                      }`}
                    >
                      {v.name}
                      {v.price !== product.price && (
                        <span className="ml-1 text-xs opacity-70">${v.price.toLocaleString()}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Cantidad</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-lg font-semibold text-foreground">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <Button
              onClick={handleAddToCart}
              size="lg"
              className="w-full text-lg gap-3 py-6 bg-primary text-primary-foreground hover:brightness-110"
            >
              <ShoppingCart className="h-5 w-5" />
              Agregar al Carrito — ${(currentPrice * quantity).toLocaleString()} MXN
            </Button>

            {/* Accordion */}
            <div className="border-t border-border pt-6 space-y-0">
              {accordionItems.map((item) => (
                <div key={item.key} className="border-b border-border">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === item.key ? null : item.key)}
                    className="w-full flex items-center justify-between py-4 text-foreground font-medium hover:text-primary transition-colors"
                  >
                    {item.title}
                    <ChevronDown className={`h-4 w-4 transition-transform ${openAccordion === item.key ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordion === item.key && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="pb-4 text-sm text-muted-foreground leading-relaxed"
                    >
                      {item.content}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetail;
