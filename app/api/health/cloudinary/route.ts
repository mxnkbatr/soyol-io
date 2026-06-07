import { NextResponse } from 'next/server';
import {
  DISABLED_CLOUDINARY_CLOUD,
  getNewCloudinaryCloudName,
  LEGACY_CLOUDINARY_CLOUD,
} from '@/lib/cloudinaryConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkCloudDelivery(cloudName: string) {
  const testUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_50/sample.jpg`;
  const res = await fetch(testUrl, { method: 'HEAD', cache: 'no-store' });
  const cldError = res.headers.get('x-cld-error');
  return { ok: res.ok, status: res.status, error: cldError };
}

export async function GET() {
  const newCloud = getNewCloudinaryCloudName();

  try {
    const legacy = await checkCloudDelivery(LEGACY_CLOUDINARY_CLOUD);
    const newCloudResult = newCloud ? await checkCloudDelivery(newCloud) : null;

    const uploadReady = !!newCloud && newCloud !== DISABLED_CLOUDINARY_CLOUD;

    return NextResponse.json({
      legacy: {
        cloudName: LEGACY_CLOUDINARY_CLOUD,
        role: 'Хуучин 363 барааны зураг (MongoDB URL-аар татагдана)',
        ok: legacy.ok,
        status: legacy.status,
        error: legacy.error,
      },
      new: newCloud
        ? {
            cloudName: newCloud,
            role: 'Шинэ upload (banner, бараа)',
            ok: newCloudResult?.ok ?? false,
            status: newCloudResult?.status,
            error: newCloudResult?.error,
            uploadConfigured: uploadReady,
          }
        : {
            cloudName: null,
            role: 'Шинэ upload',
            ok: false,
            error: `.env дээр шинэ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME тохируулна уу (${DISABLED_CLOUDINARY_CLOUD} ашиглах боломжгүй)`,
            uploadConfigured: false,
          },
      hint: 'Хуучин бараа: legacy cloud URL. Шинэ бараа/banner: new cloud upload.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
