import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Checkout from "./pages/Checkout.tsx";
import Admin from "./pages/Admin.tsx";
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
import SubStorePage from "./pages/SubStorePage.tsx";
import SeoHead from "./components/SeoHead.tsx";
import RedirectHandler from "./components/RedirectHandler.tsx";
import ThemeProvider from "./components/ThemeProvider.tsx";
import AgeGate from "./components/AgeGate.tsx";
import AffiliateRefTracker from "./components/AffiliateRefTracker.tsx";
import AffiliatePortal from "./pages/AffiliatePortal.tsx";
import AffiliateLogin from "./pages/AffiliateLogin.tsx";

const queryClient = new QueryClient();

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
          <Route path="/" element={<Index />} />
          <Route path="/tienda" element={<Index />} />
          <Route path="/shop" element={<Navigate to="/tienda" replace />} />
          <Route path="/orden-completada" element={<OrderComplete />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/cliente" element={<ClientAuth />} />
          <Route path="/mi-cuenta" element={<ClientDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
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
