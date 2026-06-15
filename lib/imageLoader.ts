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
const DEFAULT_WIDTH = 320;
const DEFAULT_QUALITY = 65;
const THUMBNAIL_MAX_WIDTH = 400;
const CARD_IMAGE_WIDTH = 280;
const DETAIL_IMAGE_WIDTH = 720;

/** Guess render width from Next/Image `sizes` or explicit width. */
export function inferImageWidth(
  sizes?: string,
  explicitWidth?: number | `${number}`,
  priority?: boolean,
): number {
  if (typeof explicitWidth === 'number') return explicitWidth;
  if (!sizes) return priority ? 400 : CARD_IMAGE_WIDTH;

  if (sizes.includes('100vw')) return DETAIL_IMAGE_WIDTH;
  if (sizes.includes('50vw')) return 480;
  if (sizes.includes('45vw') || sizes.includes('42vw')) return CARD_IMAGE_WIDTH;
  if (sizes.includes('33vw')) return 260;
  if (sizes.includes('25vw')) return 220;
  if (sizes.includes('64px') || sizes.includes('56px') || sizes.includes('40px')) {
    return 96;
  }

  return priority ? 400 : CARD_IMAGE_WIDTH;
}

export { CARD_IMAGE_WIDTH, DETAIL_IMAGE_WIDTH };

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
