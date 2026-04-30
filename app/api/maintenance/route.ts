import { NextRequest, NextResponse } from 'next/server';
import { isMaintenanceMode, setMaintenanceMode } from '@/lib/maintenance';

export async function GET(request: NextRequest) {
  try {
    // Authentification supprimée - accès libre à /admin
    const enabled = await isMaintenanceMode();
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Maintenance check error:', error);
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentification supprimée - accès libre à /admin
    const body = await request.json();
    const { enabled } = body;

    await setMaintenanceMode(enabled === true);
    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error('Maintenance toggle error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification' },
      { status: 500 }
    );
  }
}

