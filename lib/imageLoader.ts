const TRANSFORMATION_PREFIXES = [
  'f_',
  'q_',
  'w_',
  'h_',
  'c_',
  'g_',
  'e_',
  'b_',
  'a_',
  'r_',
  'dpr_',
  'ar_',
  'fl_',
];

const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 384;
const DEFAULT_QUALITY = 70;
const THUMBNAIL_MAX_WIDTH = 400;

function isTransformationSegment(segment: string): boolean {
  if (/^v\d+$/.test(segment)) return false;
  if (segment.includes(',')) return true;
  if (segment.includes('.')) return false;
  return TRANSFORMATION_PREFIXES.some((prefix) => segment.startsWith(prefix));
}

function stripExistingTransformations(resourcePath: string): string {
  const segments = resourcePath.split('/');
  while (segments.length > 0 && isTransformationSegment(segments[0])) {
    segments.shift();
  }
  return segments.join('/');
}

export function optimizeCloudinaryUrl(
  src: string,
  opts?: { width?: number; quality?: number; crop?: 'fill' | 'limit' },
): string {
  if (!src) return '';

  if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    const requestedWidth = opts?.width ?? DEFAULT_WIDTH;
    const width = Math.min(Math.max(Math.round(requestedWidth), 64), MAX_WIDTH);
    const quality = opts?.quality ?? DEFAULT_QUALITY;
    const crop =
      opts?.crop ??
      (width <= THUMBNAIL_MAX_WIDTH ? 'fill' : 'limit');

    const params =
      crop === 'fill'
        ? ['f_auto', `q_${quality}`, `w_${width}`, `h_${width}`, 'c_fill', 'g_auto']
        : ['f_auto', `q_${quality}`, `w_${width}`, 'c_limit'];

    const [base, resourcePath = ''] = src.split('/upload/');
    const cleanResourcePath = stripExistingTransformations(resourcePath);

    return `${base}/upload/${params.join(',')}/${cleanResourcePath}`;
  }

  return src;
}

export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width?: number;
  quality?: number;
}) {
  return optimizeCloudinaryUrl(src, { width, quality });
}
