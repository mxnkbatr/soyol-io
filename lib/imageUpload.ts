import { randomUUID, createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Binary, ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import {
  DISABLED_CLOUDINARY_CLOUD,
  getNewCloudinaryCloudName,
  getNewCloudinaryUploadPreset,
  isDisabledCloudinaryUrl,
} from '@/lib/cloudinaryConfig';

export { isLegacyCloudinaryUrl, isNewCloudinaryUrl, isCloudinaryUrl } from '@/lib/cloudinaryConfig';

export function isBrokenCloudinaryUrl(url?: string | null): boolean {
  return isDisabledCloudinaryUrl(url);
}

export function getFileExtension(mime: string, name?: string): string {
  const fromName = name?.split('.').pop()?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('svg')) return 'svg';
  return 'jpg';
}

/** Зөвхөн шинэ Cloudinary account руу upload хийнэ (signed эсвэл unsigned preset) */
export async function uploadToNewCloudinary(
  buffer: Buffer,
  folder = 'soyol',
  mime = 'image/jpeg',
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const cloudName = getNewCloudinaryCloudName();
  const uploadPreset = getNewCloudinaryUploadPreset();
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName) {
    return {
      ok: false,
      error: `Шинэ Cloudinary тохиргоо дутуу. NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (${DISABLED_CLOUDINARY_CLOUD} биш) тохируулна уу.`,
    };
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mime });
  formData.append('file', blob);
  formData.append('folder', folder);

  if (apiKey && apiSecret) {
    const timestamp = Math.round(Date.now() / 1000);
    const signPayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signPayload).digest('hex');
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
  } else if (uploadPreset) {
    formData.append('upload_preset', uploadPreset);
  } else {
    return { ok: false, error: 'Cloudinary API key/secret эсвэл upload preset хэрэгтэй' };
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || `Cloudinary ${res.status}` };
  }

  const url = data.secure_url as string;
  if (isDisabledCloudinaryUrl(url)) {
    return { ok: false, error: 'Cloudinary account идэвхгүй байна' };
  }

  return { ok: true, url };
}

export async function saveToMongoMedia(
  buffer: Buffer,
  contentType: string,
  folder: string,
  filename?: string,
): Promise<string> {
  const media = await getCollection('media');
  const id = new ObjectId();
  await media.insertOne({
    _id: id,
    folder,
    filename: filename ?? `${randomUUID()}.${getFileExtension(contentType, filename)}`,
    contentType,
    data: new Binary(buffer),
    createdAt: new Date(),
  });
  return `/api/media/${id.toString()}`;
}

export async function saveLocalImage(
  buffer: Buffer,
  subfolder: 'banners' | 'products',
  ext: string,
): Promise<string> {
  const id = randomUUID();
  const dir = path.join(process.cwd(), 'public', 'uploads', subfolder);
  await mkdir(dir, { recursive: true });
  const filename = `${id}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${subfolder}/${filename}`;
}

export async function uploadImage(
  buffer: Buffer,
  contentType: string,
  folder: 'banners' | 'products',
  filename?: string,
): Promise<{ url: string; source: 'cloudinary' | 'mongo' | 'local' }> {
  const cloud = await uploadToNewCloudinary(buffer, folder, contentType);
  if (cloud.ok) {
    return { url: cloud.url, source: 'cloudinary' };
  }

  // Dev fallback — production дээр шинэ Cloudinary заавал хэрэгтэй
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
      const ext = getFileExtension(contentType, filename);
      const url = await saveLocalImage(buffer, folder, ext);
      return { url, source: 'local' };
    } catch {
      // fall through
    }
  }

  throw new Error(cloud.error);
}

export async function getMediaById(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const media = await getCollection('media');
  return media.findOne({ _id: new ObjectId(id) });
}
