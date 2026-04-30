import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hasDeletedAtColumn } from '@/lib/soft-delete';

export async function GET(request: NextRequest) {
  try {
    const villeId = request.nextUrl.searchParams.get('villeId');
    const pool = getPool();

    const includeDeleted = request.nextUrl.searchParams.get('includeDeleted') === 'true';
    const hasDeletedAt = await hasDeletedAtColumn('etablissement_visite');
    
    let query = hasDeletedAt 
      ? `SELECT e.id, e.nom, e.ville_id, e.deleted_at, v.nom as ville_nom
         FROM etablissement_visite e
         JOIN ville v ON e.ville_id = v.id`
      : `SELECT e.id, e.nom, e.ville_id, v.nom as ville_nom
         FROM etablissement_visite e
         JOIN ville v ON e.ville_id = v.id`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (hasDeletedAt && !includeDeleted) {
      conditions.push('e.deleted_at IS NULL');
    }

    if (villeId) {
      conditions.push('e.ville_id = $' + (params.length + 1));
      params.push(parseInt(villeId, 10));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY v.nom, e.nom';

    const result = await pool.query(query, params);
    return NextResponse.json({ etablissements: result.rows });
  } catch (error) {
    console.error('Error fetching etablissements:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des établissements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, villeId } = body;

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de l\'établissement est requis' },
        { status: 400 }
      );
    }

    if (!villeId || typeof villeId !== 'number') {
      return NextResponse.json(
        { error: 'La ville est requise' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO etablissement_visite (nom, ville_id)
       VALUES ($1, $2)
       RETURNING id, nom, ville_id`,
      [nom.trim(), villeId]
    );

    return NextResponse.json({ etablissement: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cet établissement existe déjà dans cette ville' },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Ville introuvable' },
        { status: 404 }
      );
    }
    console.error('Error creating etablissement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'établissement' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nom, villeId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'établissement requis' },
        { status: 400 }
      );
    }

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de l\'établissement est requis' },
        { status: 400 }
      );
    }

    if (!villeId || typeof villeId !== 'number') {
      return NextResponse.json(
        { error: 'La ville est requise' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('etablissement_visite');
    const deletedAtCondition = hasDeletedAt ? 'AND deleted_at IS NULL' : '';
    const result = await pool.query(
      `UPDATE etablissement_visite 
       SET nom = $1, ville_id = $2
       WHERE id = $3 ${deletedAtCondition}
       RETURNING id, nom, ville_id`,
      [nom.trim(), villeId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Établissement non trouvé ou supprimé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ etablissement: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cet établissement existe déjà dans cette ville' },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Ville introuvable' },
        { status: 404 }
      );
    }
    console.error('Error updating etablissement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'établissement' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'établissement requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('etablissement_visite');
    
    if (hasDeletedAt) {
      // Soft delete
      const result = await pool.query(
        'UPDATE etablissement_visite SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
        [parseInt(id, 10)]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Établissement non trouvé ou déjà supprimé' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Établissement supprimé avec succès' });
    } else {
      return NextResponse.json(
        { error: 'La fonctionnalité de suppression n\'est pas encore disponible. Veuillez exécuter les migrations.' },
        { status: 501 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting etablissement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'établissement' },
      { status: 500 }
    );
  }
}

