import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hasDeletedAtColumn } from '@/lib/soft-delete';

export async function GET(request: NextRequest) {
  try {
    const villeId = request.nextUrl.searchParams.get('villeId');
    const includeDeleted = request.nextUrl.searchParams.get('includeDeleted') === 'true';
    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('periode');

    let query: string;
    const params: any[] = [];
    const conditions: string[] = [];

    if (hasDeletedAt && !includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (villeId) {
      conditions.push('ville_id = $' + (params.length + 1));
      params.push(parseInt(villeId, 10));
      query = hasDeletedAt 
        ? 'SELECT id, libelle, date_debut, date_fin, deleted_at FROM periode'
        : 'SELECT id, libelle, date_debut, date_fin FROM periode';
    } else {
      query = hasDeletedAt
        ? 'SELECT id, ville_id, libelle, date_debut, date_fin, deleted_at FROM periode'
        : 'SELECT id, ville_id, libelle, date_debut, date_fin FROM periode';
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (villeId) {
      query += ' ORDER BY date_debut';
    } else {
      query += ' ORDER BY ville_id, date_debut';
    }

    const result = await pool.query(query, params);
    return NextResponse.json({ periodes: result.rows });
  } catch (error) {
    console.error('Error fetching periodes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des périodes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { libelle, date_debut, date_fin, villeId } = body;

    if (!libelle || typeof libelle !== 'string' || libelle.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le libellé de la période est requis' },
        { status: 400 }
      );
    }

    if (!date_debut || !date_fin) {
      return NextResponse.json(
        { error: 'Les dates de début et de fin sont requises' },
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
      `INSERT INTO periode (libelle, date_debut, date_fin, ville_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, libelle, date_debut, date_fin, ville_id`,
      [libelle.trim(), date_debut, date_fin, villeId]
    );

    return NextResponse.json({ periode: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cette période existe déjà pour cette ville' },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Ville introuvable' },
        { status: 404 }
      );
    }
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'La date de fin doit être supérieure ou égale à la date de début' },
        { status: 400 }
      );
    }
    console.error('Error creating periode:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la période' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, libelle, date_debut, date_fin, villeId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la période requis' },
        { status: 400 }
      );
    }

    if (!libelle || typeof libelle !== 'string' || libelle.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le libellé de la période est requis' },
        { status: 400 }
      );
    }

    if (!date_debut || !date_fin) {
      return NextResponse.json(
        { error: 'Les dates de début et de fin sont requises' },
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
    const hasDeletedAt = await hasDeletedAtColumn('periode');
    const deletedAtCondition = hasDeletedAt ? 'AND deleted_at IS NULL' : '';
    const result = await pool.query(
      `UPDATE periode 
       SET libelle = $1, date_debut = $2, date_fin = $3, ville_id = $4
       WHERE id = $5 ${deletedAtCondition}
       RETURNING id, libelle, date_debut, date_fin, ville_id`,
      [libelle.trim(), date_debut, date_fin, villeId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Période non trouvée ou supprimée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ periode: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cette période existe déjà pour cette ville' },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Ville introuvable' },
        { status: 404 }
      );
    }
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'La date de fin doit être supérieure ou égale à la date de début' },
        { status: 400 }
      );
    }
    console.error('Error updating periode:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la période' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la période requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('periode');
    
    if (hasDeletedAt) {
      // Soft delete
      const result = await pool.query(
        'UPDATE periode SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
        [parseInt(id, 10)]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Période non trouvée ou déjà supprimée' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Période supprimée avec succès' });
    } else {
      return NextResponse.json(
        { error: 'La fonctionnalité de suppression n\'est pas encore disponible. Veuillez exécuter les migrations.' },
        { status: 501 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting periode:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la période' },
      { status: 500 }
    );
  }
}

