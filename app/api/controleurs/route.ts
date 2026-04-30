import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hasDeletedAtColumn } from '@/lib/soft-delete';

export async function GET(request: NextRequest) {
  try {
    const villeId = request.nextUrl.searchParams.get('villeId');
    const includeDeleted = request.nextUrl.searchParams.get('includeDeleted') === 'true';
    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('controleur');

    let query = hasDeletedAt
      ? `SELECT id, nom, prenom, ville_id, deleted_at FROM controleur`
      : `SELECT id, nom, prenom, ville_id FROM controleur`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (hasDeletedAt && !includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (villeId) {
      conditions.push('ville_id = $' + (params.length + 1));
      params.push(parseInt(villeId, 10));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY nom, prenom';

    const result = await pool.query(query, params);
    return NextResponse.json({ controleurs: result.rows });
  } catch (error) {
    console.error('Error fetching controleurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des contrôleurs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, prenom, villeId } = body;

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom du contrôleur est requis' },
        { status: 400 }
      );
    }

    if (!prenom || typeof prenom !== 'string' || prenom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le prénom du contrôleur est requis' },
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
      `INSERT INTO controleur (nom, prenom, ville_id)
       VALUES ($1, $2, $3)
       RETURNING id, nom, prenom, ville_id`,
      [nom.trim(), prenom.trim(), villeId]
    );

    return NextResponse.json({ controleur: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ce contrôleur existe déjà dans cette ville' },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Ville introuvable' },
        { status: 404 }
      );
    }
    console.error('Error creating controleur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du contrôleur' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nom, prenom, villeId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID du contrôleur requis' },
        { status: 400 }
      );
    }

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom du contrôleur est requis' },
        { status: 400 }
      );
    }

    if (!prenom || typeof prenom !== 'string' || prenom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le prénom du contrôleur est requis' },
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
    const hasDeletedAt = await hasDeletedAtColumn('controleur');
    const deletedAtCondition = hasDeletedAt ? 'AND deleted_at IS NULL' : '';
    const result = await pool.query(
      `UPDATE controleur 
       SET nom = $1, prenom = $2, ville_id = $3
       WHERE id = $4 ${deletedAtCondition}
       RETURNING id, nom, prenom, ville_id`,
      [nom.trim(), prenom.trim(), villeId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contrôleur non trouvé ou supprimé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ controleur: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ce contrôleur existe déjà dans cette ville' },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Ville introuvable' },
        { status: 404 }
      );
    }
    console.error('Error updating controleur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du contrôleur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID du contrôleur requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('controleur');
    
    if (hasDeletedAt) {
      // Soft delete
      const result = await pool.query(
        'UPDATE controleur SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
        [parseInt(id, 10)]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Contrôleur non trouvé ou déjà supprimé' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Contrôleur supprimé avec succès' });
    } else {
      return NextResponse.json(
        { error: 'La fonctionnalité de suppression n\'est pas encore disponible. Veuillez exécuter les migrations.' },
        { status: 501 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting controleur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du contrôleur' },
      { status: 500 }
    );
  }
}