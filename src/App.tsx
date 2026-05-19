import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";

const LegacyProductRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/producto/${id}`} replace />;
};
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Home from "./pages/Home.tsx";
import Catalogo from "./pages/Catalogo.tsx";
import { CartSheet } from "./components/CartSheet.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Checkout from "./pages/Checkout.tsx";
import Admin from "./pages/Admin.tsx";
import ThemeBuilder from "./pages/ThemeBuilder.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import ClientAuth from "./pages/ClientAuth.tsx";
import ClientDashboard from "./pages/ClientDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import OrderComplete from "./pages/OrderComplete.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import CbdPage from "./pages/CbdPage.tsx";
import EdiblesPage from "./pages/EdiblesPage.tsx";
import LaboratoriosPage from "./pages/LaboratoriosPage.tsx";
import MarcasPage from "./pages/MarcasPage.tsx";
import NeshikaPage from "./pages/NeshikaPage.tsx";
import CustomPage from "./pages/CustomPage.tsx";
import AfiliadosLanding from "./pages/AfiliadosLanding.tsx";
import SubStorePage from "./pages/SubStorePage.tsx";
import SeoHead from "./components/SeoHead.tsx";
import RedirectHandler from "./components/RedirectHandler.tsx";
import ThemeProvider from "./components/ThemeProvider.tsx";
import AgeGate from "./components/AgeGate.tsx";
import AffiliateRefTracker from "./components/AffiliateRefTracker.tsx";
import AffiliatePortal from "./pages/AffiliatePortal.tsx";
import AffiliateLogin from "./pages/AffiliateLogin.tsx";
import PromoCountdownBanner from "./components/PromoCountdownBanner.tsx";
import { useCartStore } from "./store/cartStore";

const queryClient = new QueryClient();

// Top-level guard: runs once per tab, immune to React Strict Mode double-mount and HMR.
let didResetCart = false;
if (typeof window !== 'undefined' && !didResetCart) {
  didResetCart = true;
  if (!sessionStorage.getItem('wax_cart_reset')) {
    sessionStorage.setItem('wax_cart_reset', '1');
    useCartStore.getState().clearCart();
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SeoHead />
          <RedirectHandler />
          <AgeGate />
          <AffiliateRefTracker />
          <PromoCountdownBanner />
          <CartSheet />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tienda" element={<Home />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/shop" element={<Navigate to="/tienda" replace />} />
          <Route path="/tienda/:id" element={<LegacyProductRedirect />} />
          <Route path="/shop/:id" element={<LegacyProductRedirect />} />
          <Route path="/afiliados" element={<AfiliadosLanding />} />
          <Route path="/orden-completada" element={<OrderComplete />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/cliente" element={<ClientAuth />} />
          <Route path="/mi-cuenta" element={<ClientDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/admin/theme-builder" element={<ProtectedRoute><ThemeBuilder /></ProtectedRoute>} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/cbd" element={<CbdPage />} />
          <Route path="/edibles" element={<EdiblesPage />} />
          <Route path="/laboratorios" element={<LaboratoriosPage />} />
          <Route path="/marcas" element={<MarcasPage />} />
          <Route path="/neshika" element={<NeshikaPage />} />
          <Route path="/s/:slug" element={<SubStorePage />} />
          <Route path="/portal-vendedores/login" element={<AffiliateLogin />} />
          <Route path="/portal-vendedores" element={<AffiliatePortal />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="/:slug" element={<CustomPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
