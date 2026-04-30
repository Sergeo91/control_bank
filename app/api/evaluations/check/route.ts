import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const controleurId = searchParams.get('controleurId');
    const voletId = searchParams.get('voletId');
    const periodeId = searchParams.get('periodeId');
    const etablissementId = searchParams.get('etablissementId');
    const villeId = searchParams.get('villeId');

    if (!controleurId || !voletId || !periodeId || !etablissementId || !villeId) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Trouver la mission correspondante à la période
    const periodeResult = await pool.query(
      'SELECT id, date_debut, date_fin FROM periode WHERE id = $1',
      [parseInt(periodeId, 10)]
    );

    if (periodeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Période non trouvée' },
        { status: 404 }
      );
    }

    const periode = periodeResult.rows[0];

    // Trouver la mission correspondante
    const missionResult = await pool.query(
      `SELECT id FROM mission 
       WHERE date_debut = $1 AND date_fin = $2 
       LIMIT 1`,
      [periode.date_debut, periode.date_fin]
    );

    if (missionResult.rows.length === 0) {
      return NextResponse.json({
        exists: false,
        evaluation: null,
      });
    }

    const missionId = missionResult.rows[0].id;

    // Vérifier si une évaluation existe déjà pour cette combinaison
    const evaluationResult = await pool.query(
      `SELECT 
         e.date_evaluation,
         e.created_at,
         c.nom || ' ' || c.prenom as controleur_nom,
         COUNT(DISTINCT e.rubrique_id) as nombre_rubriques
       FROM evaluation e
       JOIN controleur c ON e.controleur_id = c.id
       WHERE e.mission_id = $1
         AND e.ville_id = $2
         AND e.etablissement_visite_id = $3
         AND e.controleur_id = $4
         AND e.volet_id = $5
       GROUP BY e.date_evaluation, e.created_at, c.nom, c.prenom
       ORDER BY e.created_at DESC
       LIMIT 1`,
      [
        missionId,
        parseInt(villeId, 10),
        parseInt(etablissementId, 10),
        parseInt(controleurId, 10),
        parseInt(voletId, 10),
      ]
    );

    if (evaluationResult.rows.length > 0) {
      return NextResponse.json({
        exists: true,
        evaluation: {
          date_evaluation: evaluationResult.rows[0].date_evaluation,
          created_at: evaluationResult.rows[0].created_at,
          controleur_nom: evaluationResult.rows[0].controleur_nom,
          nombre_rubriques: parseInt(evaluationResult.rows[0].nombre_rubriques, 10),
        },
      });
    }

    return NextResponse.json({
      exists: false,
      evaluation: null,
    });
  } catch (error: any) {
    console.error('Error checking evaluation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}

