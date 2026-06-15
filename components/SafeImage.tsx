'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { inferImageWidth, optimizeCloudinaryUrl } from '@/lib/imageLoader';
import { isImageCached } from '@/lib/imagePrefetch';
import { isNativeApp } from '@/lib/nativeApp';

export const PRODUCT_PLACEHOLDER = '/placeholder-product.svg';
export const BANNER_PLACEHOLDER = '/placeholder-banner.svg';

type SafeImageProps = ImageProps & {
  fallbackSrc?: string;
};

function isCloudinaryUrl(src: string) {
  return src.includes('res.cloudinary.com');
}

function probeImageComplete(src: string): boolean {
  if (typeof window === 'undefined' || !src) return false;
  const probe = new window.Image();
  probe.src = src;
  return probe.complete && probe.naturalWidth > 0;
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
  const renderWidth = inferImageWidth(sizes, width, priority);
  const renderQuality = typeof quality === 'number' ? quality : 65;
  const native = isNativeApp();
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imgSrc, setImgSrc] = useState(initial);
  const [loaded, setLoaded] = useState(() => {
    const raw = initial && String(initial).trim() ? initial : fallbackSrc;
    return isImageCached(String(raw), renderWidth, renderQuality);
  });

  useEffect(() => {
    const next = src && String(src).trim() ? src : fallbackSrc;
    setImgSrc(next);
    setLoaded(isImageCached(String(next), renderWidth, renderQuality));
  }, [src, fallbackSrc, renderWidth, renderQuality]);

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

  useEffect(() => {
    if (loaded || !displaySrc) return;
    if (probeImageComplete(displaySrc)) {
      setLoaded(true);
      return;
    }
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [displaySrc, loaded]);

  const mergedClassName = fill
    ? [
        'absolute inset-0 h-full w-full',
        !loaded ? 'opacity-0' : 'opacity-100',
        native || priority ? 'transition-opacity duration-75' : 'transition-opacity duration-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')
    : [
        !loaded ? 'opacity-0' : 'opacity-100',
        native || priority ? 'transition-opacity duration-75' : 'transition-opacity duration-200',
        className,
      ]
        .filter(Boolean)
        .join(' ');

  const handleLoad = (event: { currentTarget: EventTarget | null }) => {
    setLoaded(true);
    onLoad?.(event as never);
  };

  const handleError = (event: { currentTarget: EventTarget | null }) => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setLoaded(false);
    }
    onError?.(event as never);
  };

  const skeleton = !loaded && fill ? (
    <span
      className="absolute inset-0 animate-pulse bg-[#EBEBF0]"
      aria-hidden
    />
  ) : null;

  if (native && useDirectCdn) {
    return (
      <span className={fill ? 'relative block h-full w-full' : 'relative inline-block'}>
        {skeleton}
        <img
          ref={imgRef}
          src={displaySrc}
          alt={typeof alt === 'string' ? alt : ''}
          className={mergedClassName}
          loading={priority ? 'eager' : loading === 'lazy' ? 'lazy' : undefined}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          width={fill ? undefined : typeof width === 'number' ? width : undefined}
          height={
            fill
              ? undefined
              : typeof props.height === 'number'
                ? props.height
                : undefined
          }
          onLoad={handleLoad}
          onError={handleError}
        />
      </span>
    );
  }

  return (
    <span className={fill ? 'relative block h-full w-full' : 'relative inline-block'}>
      {skeleton}
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
        onLoad={handleLoad}
        onError={handleError}
      />
    </span>
  );
}
