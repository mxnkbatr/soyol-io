import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadImage } from '@/lib/imageUpload';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folderRaw = (formData.get('folder') as string) || 'banners';
    const folder = folderRaw === 'products' ? 'products' : 'banners';

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Файл олдсонгүй' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Файл хэт том (max 10MB)' }, { status: 400 });
    }

    const contentType = file.type || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Зөвхөн зураг файл' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file instanceof File ? file.name : undefined;
    const result = await uploadImage(buffer, contentType, folder, filename);

    return NextResponse.json({
      url: result.url,
      source: result.source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload алдаа';
    console.error('[Upload API]', error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
