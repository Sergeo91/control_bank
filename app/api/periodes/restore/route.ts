import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la période requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      'UPDATE periode SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id, libelle, date_debut, date_fin, ville_id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Période non trouvée ou non supprimée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Période restaurée avec succès',
      periode: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error restoring periode:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la restauration de la période' },
      { status: 500 }
    );
  }
}

