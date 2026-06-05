import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { role } = await auth();
        if (role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const messagesCollection = await getCollection('support_messages');
        
        // Find all call related messages
        // Types can be 'call_invite', or messages containing call emoji/text
        const callHistory = await messagesCollection
            .find({
                $or: [
                    { type: 'call_invite' },
                    { body: { $regex: /📞|📹|дуудлага/i } }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        return NextResponse.json(callHistory);
    } catch (error) {
        console.error('Error fetching call history:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
