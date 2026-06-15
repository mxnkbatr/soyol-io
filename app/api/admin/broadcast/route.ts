import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { broadcastNotificationToAll } from '@/lib/broadcastNotification';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notificationsCollection = await getCollection('notifications');
    const history = await notificationsCollection
      .find({ type: { $in: ['admin_broadcast', 'product_promo', 'product_featured'] } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json({ history });
  } catch (error) {
    console.error('[Admin Broadcast] GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    const link = String(body.link || '/').trim() || '/';
    const productId = body.productId ? String(body.productId).trim() : undefined;
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : undefined;

    if (!title || title.length < 2) {
      return NextResponse.json({ error: 'Гарчиг хоосон байна' }, { status: 400 });
    }
    if (!message || message.length < 2) {
      return NextResponse.json({ error: 'Мэдэгдлийн текст хоосон байна' }, { status: 400 });
    }
    if (title.length > 80) {
      return NextResponse.json({ error: 'Гарчиг хэт урт (80 тэмдэгт)' }, { status: 400 });
    }
    if (message.length > 300) {
      return NextResponse.json({ error: 'Текст хэт урт (300 тэмдэгт)' }, { status: 400 });
    }

    const fcmResult = await broadcastNotificationToAll({
      title,
      message,
      link: link.startsWith('/') ? link : `/${link}`,
      type: productId ? 'product_promo' : 'admin_broadcast',
      imageUrl,
      productId,
    });

    console.log('[Admin Broadcast] Sent by', user.id, fcmResult);

    return NextResponse.json({
      success: true,
      fcm: fcmResult,
    });
  } catch (error) {
    console.error('[Admin Broadcast] POST error:', error);
    return NextResponse.json({ error: 'Мэдэгдэл илгээхэд алдаа гарлаа' }, { status: 500 });
  }
}
