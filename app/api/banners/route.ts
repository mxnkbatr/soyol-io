import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isValidBannerImage(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith('/uploads/')) return false;
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  if (url.startsWith('/api/media/')) return true;
  return url.startsWith('/');
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const showAll = searchParams.get('all') === 'true';

        const banners = await getCollection('banners');
        const query = showAll ? {} : { active: true };
        const results = await banners.find(query).sort({ order: 1 }).toArray();

        const mappedResults = results
            .filter((banner) => isValidBannerImage(banner.image))
            .map((banner) => ({
                ...banner,
                id: banner._id.toString(),
            }));

        return NextResponse.json(
            { banners: mappedResults },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                },
            },
        );
    } catch (error) {
        console.error('[Banners API] GET Error:', error);
        return NextResponse.json({ banners: [] }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId, role } = await auth();
        if (!userId || role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const banners = await getCollection('banners');

        const newBanner = {
            ...body,
            active: body.active ?? true,
            order: body.order ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await banners.insertOne(newBanner);

        return NextResponse.json({
            success: true,
            banner: { ...newBanner, id: result.insertedId.toString() }
        });
    } catch (error) {
        console.error('[Banners API] POST Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create banner' }, { status: 500 });
    }
}