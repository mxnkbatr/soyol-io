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
  ...props
}: SafeImageProps) {
  const initial = src && String(src).trim() ? src : fallbackSrc;
  const [imgSrc, setImgSrc] = useState(initial);

  useEffect(() => {
    setImgSrc(src && String(src).trim() ? src : fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <Image
      {...props}
      alt={alt}
      src={imgSrc}
      onError={(event) => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
}
