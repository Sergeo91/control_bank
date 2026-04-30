import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la mission requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      'UPDATE mission SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id, nom, date_debut, date_fin',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Mission non trouvée ou non supprimée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Mission restaurée avec succès',
      mission: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error restoring mission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la restauration de la mission' },
      { status: 500 }
    );
  }
}

