import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, received: body });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON' });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'GET works!' });
}
