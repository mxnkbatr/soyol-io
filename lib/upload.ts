import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { uploadAdminImageFile } from '@/lib/uploadClient';

interface UploadOptions {
  folder?: 'banners' | 'products';
}

/** Native admin — шинэ Cloudinary account руу upload (web admin → /api/upload/image) */
export async function pickAndUploadImage(options: UploadOptions = {}): Promise<string | null> {
  try {
    const folder = options.folder === 'banners' ? 'banners' : 'products';

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
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
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
