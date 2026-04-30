import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hasDeletedAtColumn } from '@/lib/soft-delete';

export async function GET(request: NextRequest) {
  try {
    const includeDeleted = request.nextUrl.searchParams.get('includeDeleted') === 'true';
    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('mission');
    
    let query = hasDeletedAt 
      ? 'SELECT id, nom, date_debut, date_fin, deleted_at FROM mission'
      : 'SELECT id, nom, date_debut, date_fin FROM mission';
    
    if (hasDeletedAt && !includeDeleted) {
      query += ' WHERE deleted_at IS NULL';
    }
    
    query += ' ORDER BY date_debut DESC';

    const result = await pool.query(query);

    return NextResponse.json({ missions: result.rows });
  } catch (error) {
    console.error('Error fetching missions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des missions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, date_debut, date_fin } = body;

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de la mission est requis' },
        { status: 400 }
      );
    }

    if (!date_debut || !date_fin) {
      return NextResponse.json(
        { error: 'Les dates de début et de fin sont requises' },
        { status: 400 }
      );
    }

    const pool = getPool();
    // Vérifier si la mission existe déjà
    const existing = await pool.query(
      'SELECT id FROM mission WHERE nom = $1 AND date_debut = $2 AND date_fin = $3',
      [nom.trim(), date_debut, date_fin]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ mission: existing.rows[0], id: existing.rows[0].id });
    }

    const result = await pool.query(
      `INSERT INTO mission (nom, date_debut, date_fin)
       VALUES ($1, $2, $3)
       RETURNING id, nom, date_debut, date_fin`,
      [nom.trim(), date_debut, date_fin]
    );

    return NextResponse.json({ mission: result.rows[0], id: result.rows[0].id });
  } catch (error: any) {
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'La date de fin doit être supérieure ou égale à la date de début' },
        { status: 400 }
      );
    }
    console.error('Error creating mission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la mission' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nom, date_debut, date_fin } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la mission requis' },
        { status: 400 }
      );
    }

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de la mission est requis' },
        { status: 400 }
      );
    }

    if (!date_debut || !date_fin) {
      return NextResponse.json(
        { error: 'Les dates de début et de fin sont requises' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('mission');
    const deletedAtCondition = hasDeletedAt ? 'AND deleted_at IS NULL' : '';
    const result = await pool.query(
      `UPDATE mission 
       SET nom = $1, date_debut = $2, date_fin = $3
       WHERE id = $4 ${deletedAtCondition}
       RETURNING id, nom, date_debut, date_fin`,
      [nom.trim(), date_debut, date_fin, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Mission non trouvée ou supprimée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ mission: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'La date de fin doit être supérieure ou égale à la date de début' },
        { status: 400 }
      );
    }
    console.error('Error updating mission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la mission' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la mission requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('mission');
    
    if (hasDeletedAt) {
      // Soft delete
      const result = await pool.query(
        'UPDATE mission SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
        [parseInt(id, 10)]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Mission non trouvée ou déjà supprimée' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Mission supprimée avec succès' });
    } else {
      return NextResponse.json(
        { error: 'La fonctionnalité de suppression n\'est pas encore disponible. Veuillez exécuter les migrations.' },
        { status: 501 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting mission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la mission' },
      { status: 500 }
    );
  }
}

