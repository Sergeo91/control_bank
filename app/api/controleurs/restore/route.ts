import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID du contrôleur requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      'UPDATE controleur SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id, nom, prenom, ville_id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contrôleur non trouvé ou non supprimé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Contrôleur restauré avec succès',
      controleur: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error restoring controleur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la restauration du contrôleur' },
      { status: 500 }
    );
  }
}

