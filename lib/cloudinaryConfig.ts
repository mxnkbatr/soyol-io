/** Хуучин 363 барааны зураг — MongoDB-д хадгалагдсан URL-аар CDN-ээс татагдана */
export const LEGACY_CLOUDINARY_CLOUD =
  process.env.NEXT_PUBLIC_CLOUDINARY_LEGACY_CLOUD_NAME || 'dohh4grkj';

/** Идэвхгүй болсон account — upload хийхгүй */
export const DISABLED_CLOUDINARY_CLOUD = 'dc127wztz';

/** Шинэ upload — .env дээрх шинэ Cloudinary account */
export function getNewCloudinaryCloudName(): string | undefined {
  const name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  if (!name || name === DISABLED_CLOUDINARY_CLOUD) return undefined;
  return name;
}

export function getNewCloudinaryUploadPreset(): string | undefined {
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  return preset || undefined;
}

export function getCloudNameFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/res\.cloudinary\.com\/([^/]+)\//);
  return match?.[1] ?? null;
}

export function isLegacyCloudinaryUrl(url?: string | null): boolean {
  const cloud = getCloudNameFromUrl(url);
  return cloud === LEGACY_CLOUDINARY_CLOUD;
}

export function isNewCloudinaryUrl(url?: string | null): boolean {
  const newCloud = getNewCloudinaryCloudName();
  if (!newCloud || !url) return false;
  return getCloudNameFromUrl(url) === newCloud;
}

export function isDisabledCloudinaryUrl(url?: string | null): boolean {
  return getCloudNameFromUrl(url) === DISABLED_CLOUDINARY_CLOUD;
}

export function isCloudinaryUrl(url?: string | null): boolean {
  return !!url && url.includes('res.cloudinary.com');
}
