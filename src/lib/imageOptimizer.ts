import imageCompression from 'browser-image-compression';

export interface OptimizeResult {
  full: File;
  thumb: File;
  originalSize: number;
  finalSize: number;
}

/**
 * Compress an image to a web-friendly size and produce a thumbnail variant.
 */
export async function optimizeImage(file: File): Promise<OptimizeResult> {
  const originalSize = file.size;

  // Skip optimization for SVGs and gifs
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return { full: file, thumb: file, originalSize, finalSize: file.size };
  }

  const fullOpts = {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.82,
  };
  const thumbOpts = {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 400,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.78,
  };

  const [full, thumb] = await Promise.all([
    imageCompression(file, fullOpts),
    imageCompression(file, thumbOpts),
  ]);

  return { full, thumb, originalSize, finalSize: full.size };
}

export function buildStoragePath(folder: string, originalName: string) {
  const safe = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const ts = Date.now();
  return {
    full: `${folder}/${ts}-${safe}.webp`,
    thumb: `${folder}/${ts}-${safe}-thumb.webp`,
  };
}

export function publicUrl(path: string) {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/media/${path}`;
}

export function thumbUrlFromFull(fullUrl: string) {
  // .webp -> -thumb.webp; if not webp, returns the same url
  return fullUrl.replace(/(\.[a-zA-Z0-9]+)$/, (m) => (m === '.webp' ? '-thumb.webp' : m));
}
