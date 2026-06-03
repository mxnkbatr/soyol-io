export default function imageLoader({ src, width, quality }: { src: string; width?: number; quality?: number }) {
  if (!src) return '';
  
  // Cloudinary optimization
  if (src.includes('res.cloudinary.com')) {
    const params = [
      'f_auto',
      'q_auto',
      width ? `w_${width}` : '',
      quality ? `q_${quality}` : ''
    ].filter(Boolean).join(',');
    
    // Check if URL already has transformations
    if (src.includes('/upload/')) {
      return src.replace('/upload/', `/upload/${params}/`);
    }
  }
  
  return src;
}
