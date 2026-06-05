import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Image upload utility that works on both Web and Native (iOS/Android)
 * - Native: Uses Capacitor Camera to pick from gallery or take photo
 * - Web: Uses standard file input
 * - Uploads directly to Cloudinary
 * Updated for Vercel auto-deploy.
 */

interface UploadOptions {
    folder?: string;
    multiple?: boolean;
}

export async function pickAndUploadImage(options: UploadOptions = {}): Promise<string | null> {
    try {
        let imageDataUrl: string;

        if (Capacitor.isNativePlatform()) {
            // Native Branch: Use Capacitor Camera
            const photo = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Prompt, // Asks user: Gallery or Camera
                promptLabelHeader: 'Зураг сонгох',
                promptLabelPhoto: 'Галерейгаас сонгох',
                promptLabelPicture: 'Зураг авах',
            });
            
            if (!photo.dataUrl) return null;
            imageDataUrl = photo.dataUrl;
        } else {
            // Web Branch: Use standard file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            const file = await new Promise<File | null>((resolve) => {
                input.onchange = () => {
                    const file = input.files?.[0] || null;
                    resolve(file);
                };
                input.click();
            });

            if (!file) return null;

            imageDataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            });
        }

        // Upload to Cloudinary
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dc127wztz';
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'Buddha';

        const formData = new FormData();
        formData.append('file', imageDataUrl);
        formData.append('upload_preset', uploadPreset);
        if (options.folder) {
            formData.append('folder', options.folder);
        }

        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!res.ok) {
            const errorData = await res.json();
            console.error('Cloudinary Upload Error:', errorData);
            throw new Error('Зураг хуулахад алдаа гарлаа');
        }

        const data = await res.json();
        return data.secure_url;

    } catch (error) {
        console.error('pickAndUploadImage Error:', error);
        return null;
    }
}
