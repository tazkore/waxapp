## Resumen
Crear sistema de blog completo con generación de artículos por IA + SEO automático, agregar páginas faltantes (CBD, Edibles, Laboratorios, Marcas, Neshika), reorganizar la home (quitar Legalidad, agregar Laboratorios y Marcas), y crear la marca especial Neshika con su logo.

---

## 1. Blog con IA + SEO

### Base de datos
Nueva tabla `blog_posts`:
- `id`, `slug` (único), `title`, `excerpt`, `content` (markdown/HTML)
- `cover_image_url`, `author`, `category` (cbd, edibles, nano, etc.)
- `meta_title`, `meta_description`, `keywords[]`, `og_image_url`
- `status` (draft/published), `published_at`, `views`
- `created_at`, `updated_at`
- RLS: lectura pública para `published`, escritura solo admins/moderadores
- Realtime habilitado

### Edge Function `generate-blog-post`
- Input: tema/keyword + categoría + tono opcional
- Usa Lovable AI (`google/gemini-2.5-pro`) con tool calling para devolver JSON estructurado:
  - `title`, `slug`, `excerpt`, `content` (~800-1200 palabras, markdown), `meta_title` (≤60 char), `meta_description` (≤155 char), `keywords[]` (5-8), `category`
- Opcionalmente genera imagen de portada con `google/gemini-2.5-flash-image`, sube a bucket `media`, retorna `cover_image_url`
- Solo accesible para usuarios con rol admin/moderator (verify_jwt = true)

### Admin: nueva sección "Blog"
- Item nuevo en `AdminSidebar` con icono `Newspaper`
- `BlogSection.tsx`:
  - Tabla con todos los posts (título, categoría, estado, vistas, fecha)
  - Botón "Nuevo artículo" → editor con campos manuales
  - Botón "✨ Generar con IA" → modal: tema + categoría + checkbox "generar imagen" → llama edge function → precarga el editor con el resultado para revisión
  - Editor: título, slug (auto desde título), excerpt, contenido (textarea con preview markdown), categoría, imagen de portada (ImageField existente), pestaña SEO (meta_title, meta_description, keywords, og_image), estado (draft/publicado)
  - Acciones: guardar borrador, publicar, eliminar

### Frontend público
- Ruta `/blog` → `Blog.tsx`: listado de posts publicados con filtros por categoría, paginación, tarjetas con imagen + excerpt
- Ruta `/blog/:slug` → `BlogPost.tsx`: render del artículo con SEO dinámico (extender `useSeoMeta` para cargar desde `blog_posts` cuando la ruta sea `/blog/:slug`), JSON-LD `Article`, sección "Artículos relacionados"
- Link "Blog" en Navbar y Footer

---

## 2. Reestructurar la Home

### Cambios en `Index.tsx`
- **Quitar**: `<LegalSection />`
- **Agregar/Reordenar**:
  - `<LaboratoriosSection />` nuevo: grid mostrando los laboratorios/proveedores (Ace Ultra, Muha Meds, Fryd, Kik Kalibloom, etc.) con logo + tagline
  - `<MarcasSection />` nuevo (o reusar `BrandShowcase` existente con tarjeta destacada de Neshika que enlaza a `/neshika`)
- Actualizar `Navbar` links: quitar "Legalidad", agregar "Blog", "CBD", "Edibles", "Marcas"

---

## 3. Nuevas páginas

| Ruta | Componente | Contenido |
|---|---|---|
| `/cbd` | `CbdPage.tsx` | Hero + intro a CBD, beneficios, ProductGrid filtrado por categoría `cbd`, FAQ específico |
| `/edibles` | `EdiblesPage.tsx` | Hero + intro, ProductGrid filtrado por categoría `edibles`, info dosificación |
| `/laboratorios` | `LaboratoriosPage.tsx` | Listado completo de laboratorios con descripción larga |
| `/marcas` | `MarcasPage.tsx` | Grid de marcas con tarjeta destacada Neshika |
| `/neshika` | `NeshikaPage.tsx` | Página dedicada con logo Neshika prominente, historia, productos exclusivos de la marca, paleta acorde al logo (turquesa/dorado) sobre Dark Mode Tech |
| `/blog` y `/blog/:slug` | `Blog.tsx`, `BlogPost.tsx` | (sección 1) |

- Necesitamos columna `category` en `products` (verificar; si no, agregar enum o text) para filtrar CBD/Edibles
- Cada nueva ruta registrada en `App.tsx` y poblada en `seo_pages` con valores por defecto

### Logo Neshika
- Copiar `user-uploads://logo_Neshika_oficial.png` a `src/assets/neshika-logo.png`
- Crear marca "Neshika" en tabla `brands` con `logo_url` apuntando al asset (o subir a bucket `media`)
- Tarjeta especial en home y `/marcas` con borde turquesa + glow, link a `/neshika`

---

## 4. SEO

- Insertar entradas en `seo_pages` para `/blog`, `/cbd`, `/edibles`, `/laboratorios`, `/marcas`, `/neshika` con meta_title/description y `auto_sitemap = true` para que aparezcan en `generate-sitemap`
- Para `/blog/:slug`: extender `useSeoMeta` para detectar el patrón y cargar SEO desde `blog_posts` en lugar de `seo_pages`
- Generador de IA produce SEO ya optimizado por artículo

---

## Detalles técnicos

```text
src/
├── pages/
│   ├── Blog.tsx                (nuevo)
│   ├── BlogPost.tsx            (nuevo)
│   ├── CbdPage.tsx             (nuevo)
│   ├── EdiblesPage.tsx         (nuevo)
│   ├── LaboratoriosPage.tsx    (nuevo)
│   ├── MarcasPage.tsx          (nuevo)
│   └── NeshikaPage.tsx         (nuevo)
├── components/
│   ├── LaboratoriosSection.tsx (nuevo, para home)
│   ├── admin/BlogSection.tsx   (nuevo)
│   └── admin/BlogEditor.tsx    (nuevo)
├── assets/neshika-logo.png     (copiado del upload)
└── hooks/useSeoMeta.ts         (extendido para /blog/:slug)

supabase/
├── migrations/...              (blog_posts + RLS + realtime + seo_pages seed)
└── functions/generate-blog-post/index.ts (nuevo)
```

- Usa `react-markdown` (instalar) para renderizar contenido del blog
- Reutiliza `ImageField`, `MediaPickerDialog` para imágenes
- Categorías de productos: si la columna no existe, migración para añadir `category text` a `products` y backfill de los 4 productos seed

---

## Preguntas opcionales
1. ¿La generación de imagen de portada por IA debe ser obligatoria o solo opcional por artículo? (default: opcional)
2. ¿Quieres comentarios en los artículos del blog? (default: no, solo lectura)
3. Para `/cbd` y `/edibles`: ¿filtrar productos existentes por categoría o son catálogos separados? (default: filtrar; requiere asignar categoría a productos)
