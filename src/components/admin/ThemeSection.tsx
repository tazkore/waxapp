import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, ImageIcon, Menu, FileText, Sparkles } from 'lucide-react';
import ThemeIdentitySection from './theme/ThemeIdentitySection';
import ThemeAppearanceSection from './theme/ThemeAppearanceSection';
import ThemeMenusSection from './theme/ThemeMenusSection';
import ThemePagesSection from './theme/ThemePagesSection';

const ThemeSection = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tema del sitio</h2>
          <p className="text-sm text-muted-foreground">Personaliza identidad, colores, menús y páginas sin tocar código.</p>
        </div>
      </div>

      <Tabs defaultValue="identity" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="identity" className="gap-2"><ImageIcon className="h-4 w-4" /> Identidad</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" /> Apariencia</TabsTrigger>
          <TabsTrigger value="menus" className="gap-2"><Menu className="h-4 w-4" /> Menús</TabsTrigger>
          <TabsTrigger value="pages" className="gap-2"><FileText className="h-4 w-4" /> Páginas</TabsTrigger>
        </TabsList>

        <TabsContent value="identity"><ThemeIdentitySection /></TabsContent>
        <TabsContent value="appearance"><ThemeAppearanceSection /></TabsContent>
        <TabsContent value="menus"><ThemeMenusSection /></TabsContent>
        <TabsContent value="pages"><ThemePagesSection /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ThemeSection;
