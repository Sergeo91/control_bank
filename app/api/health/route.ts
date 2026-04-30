import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

