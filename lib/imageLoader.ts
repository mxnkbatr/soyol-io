export default function imageLoader({ src, width, quality }: { src: string; width?: number; quality?: number }) {
  if (!src) return '';
  
  // Cloudinary optimization
  if (src.includes('res.cloudinary.com')) {
    const params = [
      'f_auto',
      'q_auto',
      'dpr_auto',
      width ? `w_${width}` : '',
      quality ? `q_${quality}` : '',
      'c_limit' // Prevent upscaling beyond original size
    ].filter(Boolean).join(',');
    
    // Check if URL already has transformations
    // Cloudinary URLs look like: .../upload/v12345/path/to/image.jpg
    // or .../upload/w_100,c_fill/v12345/...
    if (src.includes('/upload/')) {
      // If there are already transformations (e.g., /upload/w_100/...), we should be careful
      // But usually, we can just insert ours after /upload/
      const parts = src.split('/upload/');
      return `${parts[0]}/upload/${params}/${parts[1]}`;
    }
  }
  
  return src;
}
