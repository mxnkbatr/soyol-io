import { NextRequest, NextResponse } from 'next/server';
import { getMediaById } from '@/lib/imageUpload';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const doc = await getMediaById(id);

    if (!doc?.data) {
      return new NextResponse('Not found', { status: 404 });
    }

    const buffer = Buffer.from(doc.data.buffer);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': doc.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Media API]', error);
    return new NextResponse('Error', { status: 500 });
  }
}
