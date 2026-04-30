import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hasDeletedAtColumn } from '@/lib/soft-delete';

export async function GET(request: NextRequest) {
  try {
    const includeDeleted = request.nextUrl.searchParams.get('includeDeleted') === 'true';
    const pool = getPool();
    
    // Vérifier si la colonne deleted_at existe
    const hasDeletedAt = await hasDeletedAtColumn('ville');
    
    let query = hasDeletedAt ? 'SELECT id, nom, deleted_at FROM ville' : 'SELECT id, nom FROM ville';
    
    if (hasDeletedAt && !includeDeleted) {
      query += ' WHERE deleted_at IS NULL';
    }
    
    query += ' ORDER BY nom';

    const result = await pool.query(query);

    return NextResponse.json({ villes: result.rows });
  } catch (error) {
    console.error('Error fetching villes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des villes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom } = body;

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de la ville est requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      'INSERT INTO ville (nom) VALUES ($1) RETURNING id, nom',
      [nom.trim()]
    );

    return NextResponse.json({ ville: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cette ville existe déjà' },
        { status: 409 }
      );
    }
    console.error('Error creating ville:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la ville' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nom } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la ville requis' },
        { status: 400 }
      );
    }

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de la ville est requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('ville');
    const deletedAtCondition = hasDeletedAt ? 'AND deleted_at IS NULL' : '';
    const result = await pool.query(
      `UPDATE ville 
       SET nom = $1
       WHERE id = $2 ${deletedAtCondition}
       RETURNING id, nom`,
      [nom.trim(), id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ville non trouvée ou supprimée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ville: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cette ville existe déjà' },
        { status: 409 }
      );
    }
    console.error('Error updating ville:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la ville' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la ville requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const hasDeletedAt = await hasDeletedAtColumn('ville');
    
    if (hasDeletedAt) {
      // Soft delete : marquer comme supprimé au lieu de supprimer réellement
      const result = await pool.query(
        'UPDATE ville SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
        [parseInt(id, 10)]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Ville non trouvée ou déjà supprimée' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, message: 'Ville supprimée avec succès' });
    } else {
      // Si deleted_at n'existe pas, on ne peut pas faire de soft delete
      // On retourne une erreur pour indiquer qu'il faut exécuter la migration
      return NextResponse.json(
        { error: 'La fonctionnalité de suppression n\'est pas encore disponible. Veuillez exécuter les migrations.' },
        { status: 501 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting ville:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la ville' },
      { status: 500 }
    );
  }
}

