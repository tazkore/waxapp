# Wizard de Onboarding + Importador de Sitios con IA

Dos features integradas: un **wizard inicial de un solo paso** para configurar marca/logos/APIs, y un **importador de sitios** que copia productos e imágenes de cualquier web (incluyendo el sitio anterior del cliente) usando IA.

## 1. Wizard Inicial "Setup en 1 paso"

Modal/página que aparece automáticamente la primera vez que un super admin entra al panel (si `theme_settings.site_name = 'WAXAPP'` por defecto). Incluye:

- **Identidad**: nombre del sitio, tagline, logo claro, logo oscuro, favicon, OG image (todos en una sola pantalla con drag & drop).
- **Colores principales**: primario, secundario, fondo (3 color pickers).
- **APIs / Conexiones rápidas** (botones que invocan los flujos existentes):
  - Resend (emails) — vía connector
  - Clip (pagos) — usa secrets ya guardados
  - Firecrawl (scraping/importación) — vía connector
  - Lovable AI — ya configurado, solo se muestra "✓ Activo"
- **Importar tienda anterior** (opcional, expandible): campo URL + botón "Importar con IA" (lanza el wizard de importación, ver sección 2).
- **Botón "Finalizar"**: guarda todo y marca `onboarding_completed = true`.

Acceso posterior: link permanente en sidebar **"Setup Inicial"** (icono Sparkles) por si el super admin quiere reabrirlo.

## 2. Importador de Sitios con Firecrawl + IA

Sección nueva **"Importar Sitio"** en el sidebar (solo super_admin), también accesible desde el wizard.

Flujo:
```text
1. Usuario pega URL (ej: https://tienda-anterior.com)
2. Firecrawl /map → descubre todas las URLs del sitio
3. Usuario elige qué importar: [✓] Productos  [✓] Imágenes  [✓] Branding
4. Por cada URL de producto: Firecrawl /scrape (markdown + screenshot + branding)
5. Lovable AI extrae datos estructurados: { name, price, description, sku, images[] }
6. Las imágenes se descargan y suben al bucket `media`
7. Vista previa tabular: el admin marca cuáles importar, edita precios
8. Click "Importar X productos" → INSERT batch en tabla products
```

**¿Por qué Firecrawl?** Es el conector recomendado de Lovable, tiene plan gratis (500 créditos/mes), maneja JS/anti-bot, y devuelve markdown + branding (colores y fonts del sitio original) que podemos usar para autocompletar el theme.

**Bonus "Copiar mi página anterior con IA"**: además de productos, extrae el branding (colores, logo, fonts) y propone aplicarlo al theme automáticamente — útil para migración total.

## 3. Cambios en BD

Una sola migración:

- Añadir columna `onboarding_completed boolean default false` a `theme_settings`.
- Nueva tabla **import_jobs**: trackea cada importación (url origen, status, productos encontrados, importados, errores). RLS solo super_admin.

## 4. Edge Functions nuevas

- **`firecrawl-map`**: recibe URL, llama Firecrawl /map, devuelve lista de URLs.
- **`firecrawl-scrape-products`**: recibe array de URLs, scrape + extrae con Lovable AI (Gemini Flash) → JSON estructurado de productos.
- **`firecrawl-import-branding`**: recibe URL, scrape con `formats: ['branding']`, devuelve colores/fonts/logos.
- **`import-products`**: recibe productos validados, descarga imágenes a Storage, inserta en tabla `products`.

Todas verifican `super_admin` y registran en `import_jobs`.

## 5. UI nueva

- `src/components/admin/OnboardingWizard.tsx` — modal con tabs internas (identidad/colores/APIs/importar).
- `src/components/admin/SiteImporterSection.tsx` — sección dedicada al importador con vista previa y selección masiva.
- Hook `useOnboardingStatus()` que detecta si hay que mostrar el wizard.
- Entrada en `AdminSidebar.tsx` y `Admin.tsx` para `setup` e `importer`.

## 6. Conexión Firecrawl

Antes de implementar, te pediré aprobar la conexión a **Firecrawl** (conector estándar de Lovable, plan gratis 500 créditos/mes — alcanza para importar ~500 páginas). Si prefieres no usar Firecrawl, las alternativas gratuitas serias son escasas (ScrapingBee/Apify cobran rápido). Firecrawl es la mejor opción gratis + IA-ready.

## Notas técnicas

- El wizard usa los componentes shadcn ya existentes (Dialog, Tabs, Input, Button) y los tokens del design system Dark Mode Tech.
- Las imágenes scrapeadas se guardan en `media/imported/{job_id}/...` para poder limpiar fácil.
- Productos importados quedan como `is_active = false` por defecto para que el admin revise antes de publicar.
- El conector Firecrawl es server-side: la edge function lee `FIRECRAWL_API_KEY` desde env, nunca se expone al browser.
