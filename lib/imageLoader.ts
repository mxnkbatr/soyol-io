const TRANSFORMATION_PREFIXES = ['f_', 'q_', 'w_', 'h_', 'c_', 'g_', 'e_', 'b_', 'a_', 'r_', 'dpr_', 'ar_', 'fl_'];

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

export default function imageLoader({ src, width, quality }: { src: string; width?: number; quality?: number }) {
  if (!src) return '';

  if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    const params = [
      'f_auto',
      quality ? `q_${quality}` : 'q_auto',
      width ? `w_${width}` : '',
      'c_limit',
    ]
      .filter(Boolean)
      .join(',');

    const [base, resourcePath = ''] = src.split('/upload/');
    const cleanResourcePath = stripExistingTransformations(resourcePath);

    return `${base}/upload/${params}/${cleanResourcePath}`;
  }

  return src;
}
