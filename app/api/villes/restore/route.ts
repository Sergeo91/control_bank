import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la ville requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    // Restaurer : remettre deleted_at à NULL
    const result = await pool.query(
      'UPDATE ville SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id, nom',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ville non trouvée ou non supprimée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Ville restaurée avec succès',
      ville: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error restoring ville:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la restauration de la ville' },
      { status: 500 }
    );
  }
}

