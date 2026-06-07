'use client';

import { useEffect, useState } from 'react';
import Image, { ImageProps } from 'next/image';

export const PRODUCT_PLACEHOLDER = '/placeholder-product.svg';
export const BANNER_PLACEHOLDER = '/placeholder-banner.svg';

type SafeImageProps = ImageProps & {
  fallbackSrc?: string;
};

export default function SafeImage({
  src,
  fallbackSrc = PRODUCT_PLACEHOLDER,
  onError,
  alt,
  quality = 70,
  loading,
  priority,
  fill,
  className,
  ...props
}: SafeImageProps) {
  const initial = src && String(src).trim() ? src : fallbackSrc;
  const [imgSrc, setImgSrc] = useState(initial);

  useEffect(() => {
    setImgSrc(src && String(src).trim() ? src : fallbackSrc);
  }, [src, fallbackSrc]);

  const mergedClassName = fill
    ? ['absolute inset-0 h-full w-full', className].filter(Boolean).join(' ')
    : className;

  return (
    <Image
      {...props}
      fill={fill}
      alt={alt}
      src={imgSrc}
      quality={quality}
      priority={priority}
      className={mergedClassName}
      loading={loading ?? (priority ? undefined : 'lazy')}
      onError={(event) => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
}
