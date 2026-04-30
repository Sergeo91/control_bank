import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const authResult = await verifyAuth(request);
    if (!authResult.user || authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, deleteAll } = body;

    const pool = getPool();
    await pool.query('BEGIN');

    try {
      if (deleteAll) {
        // Restaurer toutes les évaluations
        const result = await pool.query('UPDATE evaluation SET deleted_at = NULL WHERE deleted_at IS NOT NULL RETURNING id');
        await pool.query('COMMIT');
        return NextResponse.json({
          success: true,
          restored: result.rowCount,
          message: `${result.rowCount} évaluation(s) restaurée(s)`,
        });
      } else {
        if (!id) {
          await pool.query('ROLLBACK');
          return NextResponse.json(
            { error: 'ID de l\'évaluation requis' },
            { status: 400 }
          );
        }

        // Restaurer une évaluation spécifique
        const result = await pool.query(
          'UPDATE evaluation SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id',
          [id]
        );

        if (result.rows.length === 0) {
          await pool.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Évaluation non trouvée ou non supprimée' },
            { status: 404 }
          );
        }

        await pool.query('COMMIT');
        return NextResponse.json({
          success: true,
          restored: result.rowCount,
          message: 'Évaluation restaurée avec succès',
        });
      }
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Error restoring evaluation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la restauration' },
      { status: 500 }
    );
  }
}

