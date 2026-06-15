'use client';

import { useEffect, useMemo, useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { inferImageWidth, optimizeCloudinaryUrl } from '@/lib/imageLoader';

export const PRODUCT_PLACEHOLDER = '/placeholder-product.svg';
export const BANNER_PLACEHOLDER = '/placeholder-banner.svg';

type SafeImageProps = ImageProps & {
  fallbackSrc?: string;
};

function isCloudinaryUrl(src: string) {
  return src.includes('res.cloudinary.com');
}

export default function SafeImage({
  src,
  fallbackSrc = PRODUCT_PLACEHOLDER,
  onError,
  onLoad,
  alt,
  quality = 65,
  loading,
  priority,
  fill,
  sizes,
  width,
  className,
  ...props
}: SafeImageProps) {
  const initial = src && String(src).trim() ? src : fallbackSrc;
  const [imgSrc, setImgSrc] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setImgSrc(src && String(src).trim() ? src : fallbackSrc);
    setLoaded(false);
  }, [src, fallbackSrc]);

  const displaySrc = useMemo(() => {
    const raw = String(imgSrc || fallbackSrc);
    if (!isCloudinaryUrl(raw)) return raw;

    const w = inferImageWidth(sizes, width, priority);
    const q = typeof quality === 'number' ? quality : 65;
    return optimizeCloudinaryUrl(raw, {
      width: w,
      quality: q,
      crop: w <= 400 ? 'fill' : 'limit',
    });
  }, [imgSrc, fallbackSrc, sizes, width, priority, quality]);

  const useDirectCdn = isCloudinaryUrl(displaySrc);

  const mergedClassName = fill
    ? [
        'absolute inset-0 h-full w-full',
        !loaded ? 'opacity-0' : 'opacity-100',
        'transition-opacity duration-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')
    : [
        !loaded ? 'opacity-0' : 'opacity-100',
        'transition-opacity duration-200',
        className,
      ]
        .filter(Boolean)
        .join(' ');

  return (
    <span className={fill ? 'relative block h-full w-full' : 'relative inline-block'}>
      {!loaded && fill && (
        <span
          className="absolute inset-0 animate-pulse bg-[#EBEBF0]"
          aria-hidden
        />
      )}
      <Image
        {...props}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : props.height}
        sizes={sizes}
        alt={alt}
        src={displaySrc}
        unoptimized={useDirectCdn}
        priority={priority}
        className={mergedClassName}
        loading={loading ?? (priority ? undefined : 'lazy')}
        decoding="async"
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          if (imgSrc !== fallbackSrc) {
            setImgSrc(fallbackSrc);
            setLoaded(false);
          }
          onError?.(event);
        }}
      />
    </span>
  );
}
