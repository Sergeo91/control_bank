import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { hasDeletedAtColumn } from '@/lib/soft-delete';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const authResult = await verifyAuth(request);
    if (!authResult.user || authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const villeId = searchParams.get('villeId');
    const etablissementId = searchParams.get('etablissementId');
    const periodeId = searchParams.get('periodeId');
    const voletId = searchParams.get('voletId');

    const pool = getPool();
    const params: any[] = [];
    const whereConditions: string[] = [];

    // Construire la clause WHERE
    if (villeId) {
      whereConditions.push(`ev.ville_id = $${params.length + 1}`);
      params.push(parseInt(villeId, 10));
    }
    if (etablissementId) {
      whereConditions.push(`ev.etablissement_visite_id = $${params.length + 1}`);
      params.push(parseInt(etablissementId, 10));
    }
    if (voletId) {
      whereConditions.push(`ev.volet_id = $${params.length + 1}`);
      params.push(parseInt(voletId, 10));
    }

    // Trouver la mission correspondante à la période
    let missionId: number | null = null;
    if (periodeId) {
      const periodeResult = await pool.query(
        'SELECT id, date_debut, date_fin FROM periode WHERE id = $1',
        [parseInt(periodeId, 10)]
      );

      if (periodeResult.rows.length > 0) {
        const periode = periodeResult.rows[0];
        const missionResult = await pool.query(
          `SELECT id FROM mission 
           WHERE date_debut = $1 AND date_fin = $2 
           LIMIT 1`,
          [periode.date_debut, periode.date_fin]
        );

        if (missionResult.rows.length > 0) {
          missionId = missionResult.rows[0].id;
          whereConditions.push(`ev.mission_id = $${params.length + 1}`);
          params.push(missionId);
        }
      }
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Vérifier si deleted_at existe
    const hasDeletedAt = await hasDeletedAtColumn('controleur');
    const deletedAtCondition = hasDeletedAt ? 'AND c.deleted_at IS NULL' : '';
    
    // Récupérer tous les contrôleurs pour cette ville/établissement
    const controleursQuery = `
      SELECT DISTINCT c.id, c.nom, c.prenom
      FROM controleur c
      ${villeId ? `WHERE c.ville_id = $${params.length + 1} ${deletedAtCondition}` : hasDeletedAt ? `WHERE c.deleted_at IS NULL` : ''}
      ORDER BY c.nom, c.prenom
    `;
    
    const controleursParams = villeId ? [parseInt(villeId, 10)] : [];
    const controleursResult = await pool.query(controleursQuery, controleursParams);
    const totalControleurs = controleursResult.rows.length;

    // Récupérer les contrôleurs ayant soumis des évaluations
    // Un volet évalué = 1 évaluation (même si le volet contient 12 rubriques)
    // On compte les combinaisons uniques de (controleur, volet, mission, ville, établissement)
    // En utilisant DISTINCT ON pour obtenir une ligne par combinaison unique
    const controleursAvecEvaluationsQuery = `
      SELECT 
        controleur_id,
        nom,
        prenom,
        COUNT(*) as evaluations_count,
        COUNT(DISTINCT volet_id) as volets_evalues,
        MAX(date_evaluation) as derniere_evaluation,
        MAX(created_at) as derniere_soumission
      FROM (
        SELECT DISTINCT ON (ev.controleur_id, ev.volet_id, ev.mission_id, ev.ville_id, ev.etablissement_visite_id)
          ev.controleur_id,
          ev.volet_id,
          ev.mission_id,
          ev.ville_id,
          ev.etablissement_visite_id,
          ev.date_evaluation,
          ev.created_at,
          c.nom,
          c.prenom
        FROM evaluation ev
        JOIN controleur c ON ev.controleur_id = c.id ${hasDeletedAt ? 'AND c.deleted_at IS NULL' : ''}
        ${whereClause}
        ORDER BY ev.controleur_id, ev.volet_id, ev.mission_id, ev.ville_id, ev.etablissement_visite_id, ev.created_at DESC
      ) AS evaluations_uniques
      GROUP BY controleur_id, nom, prenom
      ORDER BY nom, prenom
    `;

    const controleursAvecEvaluationsResult = await pool.query(
      controleursAvecEvaluationsQuery,
      params
    );

    const controleursAvecEvaluations = controleursAvecEvaluationsResult.rows.map((row) => ({
      id: row.controleur_id,
      nom: row.nom,
      prenom: row.prenom,
      nom_complet: `${row.nom} ${row.prenom}`,
      volets_evalues: parseInt(row.volets_evalues, 10),
      derniere_evaluation: row.derniere_evaluation,
      derniere_soumission: row.derniere_soumission,
    }));

    const controleursAvecEvaluationsIds = new Set(
      controleursAvecEvaluations.map((c) => c.id)
    );

    // Récupérer les contrôleurs n'ayant pas soumis d'évaluations
    const controleursSansEvaluations = controleursResult.rows
      .filter((c) => !controleursAvecEvaluationsIds.has(c.id))
      .map((c) => ({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        nom_complet: `${c.nom} ${c.prenom}`,
      }));

    return NextResponse.json({
      total: totalControleurs,
      avec_evaluations: {
        nombre: controleursAvecEvaluations.length,
        controleurs: controleursAvecEvaluations,
      },
      sans_evaluations: {
        nombre: controleursSansEvaluations.length,
        controleurs: controleursSansEvaluations,
      },
    });
  } catch (error: any) {
    console.error('Error fetching controleurs stats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}

