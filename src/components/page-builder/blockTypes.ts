// Catálogo central de bloques del Page Builder
export type BlockType =
  | 'hero'
  | 'text'
  | 'image'
  | 'productGrid'
  | 'banner'
  | 'faq'
  | 'cta'
  | 'columns'
  | 'spacer'
  | 'video';

export interface PageBlock {
  id: string;
  type: BlockType;
  data: Record<string, any>;
}

export const BLOCK_DEFAULTS: Record<BlockType, Record<string, any>> = {
  hero: {
    title: 'Título principal',
    subtitle: 'Subtítulo descriptivo',
    ctaText: 'Comprar ahora',
    ctaUrl: '/',
    imageUrl: '',
    align: 'center',
  },
  text: {
    content: 'Escribe tu contenido aquí. Soporta saltos de línea.',
    align: 'left',
  },
  image: {
    url: '',
    alt: '',
    caption: '',
    width: 'full', // full | wide | medium
  },
  productGrid: {
    title: 'Productos destacados',
    category: '',
    limit: 8,
    onlyFeatured: false,
  },
  banner: {
    title: 'Banner promocional',
    subtitle: '',
    bgColor: 'hsl(var(--primary))',
    textColor: 'hsl(var(--primary-foreground))',
    ctaText: 'Ver más',
    ctaUrl: '/',
  },
  faq: {
    title: 'Preguntas frecuentes',
    items: [
      { q: '¿Pregunta 1?', a: 'Respuesta 1.' },
      { q: '¿Pregunta 2?', a: 'Respuesta 2.' },
    ],
  },
  cta: {
    title: '¿Listo para empezar?',
    subtitle: 'Únete hoy mismo',
    ctaText: 'Empezar',
    ctaUrl: '/',
  },
  columns: {
    columns: [
      { title: 'Columna 1', text: 'Contenido...' },
      { title: 'Columna 2', text: 'Contenido...' },
      { title: 'Columna 3', text: 'Contenido...' },
    ],
  },
  spacer: { size: 'md' }, // sm | md | lg | xl
  video: { url: '', caption: '' },
};

export const BLOCK_LABELS: Record<BlockType, { label: string; icon: string; desc: string }> = {
  hero: { label: 'Hero', icon: '🎯', desc: 'Cabecera con título, subtítulo y CTA' },
  text: { label: 'Texto', icon: '📝', desc: 'Bloque de texto simple' },
  image: { label: 'Imagen', icon: '🖼️', desc: 'Imagen con caption opcional' },
  productGrid: { label: 'Grid de productos', icon: '🛍️', desc: 'Lista de productos por categoría' },
  banner: { label: 'Banner', icon: '🎨', desc: 'Banner promocional con CTA' },
  faq: { label: 'FAQ', icon: '❓', desc: 'Preguntas frecuentes con acordeón' },
  cta: { label: 'CTA', icon: '⚡', desc: 'Llamado a la acción destacado' },
  columns: { label: 'Columnas', icon: '🧱', desc: 'Bloque de 2-4 columnas' },
  spacer: { label: 'Espaciador', icon: '↕️', desc: 'Espacio vertical' },
  video: { label: 'Video', icon: '🎬', desc: 'Video embebido (YouTube/Vimeo)' },
};

export const newBlock = (type: BlockType): PageBlock => ({
  id: crypto.randomUUID(),
  type,
  data: JSON.parse(JSON.stringify(BLOCK_DEFAULTS[type])),
});
