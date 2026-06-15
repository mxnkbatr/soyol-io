import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { uploadAdminImageFile } from '@/lib/uploadClient';

export type PickSource = 'gallery' | 'camera' | 'prompt';

interface UploadOptions {
  folder?: 'banners' | 'products';
  source?: PickSource;
}

function resolveCameraSource(source: PickSource = 'gallery') {
  if (source === 'camera') return CameraSource.Camera;
  if (source === 'prompt') return CameraSource.Prompt;
  return CameraSource.Photos;
}

/** Native/web admin — Cloudinary руу upload. Утас дээр шууд галерей нээнэ. */
export async function pickAndUploadImage(options: UploadOptions = {}): Promise<string | null> {
  try {
    const folder = options.folder === 'banners' ? 'banners' : 'products';
    const source = options.source ?? (Capacitor.isNativePlatform() ? 'gallery' : 'gallery');

    if (!Capacitor.isNativePlatform()) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      const file = await new Promise<File | null>((resolve) => {
        input.onchange = () => resolve(input.files?.[0] ?? null);
        input.click();
      });

      if (!file) return null;
      const { url } = await uploadAdminImageFile(file, folder);
      return url;
    }

    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: resolveCameraSource(source),
      promptLabelHeader: 'Зураг сонгох',
      promptLabelPhoto: 'Галерейгаас сонгох',
      promptLabelPicture: 'Зураг авах',
    });

    if (!photo.dataUrl) return null;

    const blob = await fetch(photo.dataUrl).then((r) => r.blob());
    const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
    const { url } = await uploadAdminImageFile(file, folder);
    return url;
  } catch (error) {
    console.error('pickAndUploadImage Error:', error);
    return null;
  }
}
