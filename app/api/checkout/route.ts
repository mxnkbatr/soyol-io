import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED — use /api/orders
// Accepting NextRequest keeps standard Next.js signatures and allows tests to compile.
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Endpoint deprecated. Use /api/orders.' },
    { status: 410 }
  );
}