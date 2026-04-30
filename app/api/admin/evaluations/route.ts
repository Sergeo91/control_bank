import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

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
    const controleurId = searchParams.get('controleurId');
    const voletId = searchParams.get('voletId');
    const periodeId = searchParams.get('periodeId');
    const etablissementId = searchParams.get('etablissementId');
    const villeId = searchParams.get('villeId');

    if (!controleurId || !voletId || !periodeId || !etablissementId || !villeId) {
      return NextResponse.json(
        { error: 'Tous les paramètres sont requis' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Récupérer la période (sert au libellé et à la correspondance mission, mais on ne bloque plus si la mission est absente)
    const periodeResult = await pool.query(
      'SELECT id, libelle, date_debut, date_fin FROM periode WHERE id = $1',
      [parseInt(periodeId, 10)]
    );

    if (periodeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Période non trouvée' },
        { status: 404 }
      );
    }

    const periode = periodeResult.rows[0];

    // Essayer de trouver la mission liée aux dates de la période (peut être absent pour les nouvelles villes)
    const missionResult = await pool.query(
      `SELECT id FROM mission 
       WHERE date_debut = $1 AND date_fin = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [periode.date_debut, periode.date_fin]
    );

    const missionId = missionResult.rows.length > 0 ? missionResult.rows[0].id : null;

    // Paramètres communs
    const baseParams = [
      parseInt(villeId, 10),
      parseInt(etablissementId, 10),
      parseInt(controleurId, 10),
      parseInt(voletId, 10),
    ];

    const buildEvaluationQuery = (withMission: boolean) => {
      const params = [...baseParams];
      let missionClause = '';
      if (withMission && missionId) {
        missionClause = ` AND e.mission_id = $${params.length + 1}`;
        params.push(missionId);
      }

      const query = `
        SELECT 
          e.mission_id,
          e.date_evaluation,
          e.created_at,
          c.nom || ' ' || c.prenom as controleur_nom,
          v.nom as ville_nom,
          et.nom as etablissement_nom,
          vo.libelle as volet_libelle
        FROM evaluation e
        JOIN controleur c ON e.controleur_id = c.id
        JOIN ville v ON e.ville_id = v.id
        JOIN etablissement_visite et ON e.etablissement_visite_id = et.id
        JOIN volet vo ON e.volet_id = vo.id
        WHERE e.ville_id = $1
          AND e.etablissement_visite_id = $2
          AND e.controleur_id = $3
          AND e.volet_id = $4
          AND e.deleted_at IS NULL
          ${missionClause}
        ORDER BY e.created_at DESC
        LIMIT 1
      `;

      return { query, params };
    };

    // 1) Essayer avec la mission liée à la période (si existante)
    let { query, params } = buildEvaluationQuery(true);
    let evaluationInfoResult = await pool.query(query, params);

    // 2) Fallback : récupérer la dernière évaluation même si la mission ne correspond pas (utile pour nouvelles villes)
    if (evaluationInfoResult.rows.length === 0) {
      ({ query, params } = buildEvaluationQuery(false));
      evaluationInfoResult = await pool.query(query, params);
    }

    if (evaluationInfoResult.rows.length === 0) {
      return NextResponse.json({
        evaluation: null,
        rubriques: [],
      });
    }

    const evaluationInfo = evaluationInfoResult.rows[0];

    // Récupérer toutes les rubriques évaluées (alignées sur la mission réellement trouvée)
    const rubriquesParams = [
      evaluationInfo.mission_id,
      ...baseParams,
    ];

    const rubriquesResult = await pool.query(
      `SELECT 
         r.id as rubrique_id,
         r.numero,
         r.libelle,
         r.composante_evaluee,
         r.criteres_indicateurs,
         r.mode_verification,
         e.note,
         e.commentaire,
         e.date_evaluation,
         e.created_at
       FROM evaluation e
       JOIN rubrique r ON e.rubrique_id = r.id
       WHERE e.mission_id = $1
         AND e.ville_id = $2
         AND e.etablissement_visite_id = $3
         AND e.controleur_id = $4
         AND e.volet_id = $5
         AND e.deleted_at IS NULL
       ORDER BY r.numero`,
      rubriquesParams
    );

    return NextResponse.json({
      evaluation: {
        controleur_nom: evaluationInfo.controleur_nom,
        ville_nom: evaluationInfo.ville_nom,
        etablissement_nom: evaluationInfo.etablissement_nom,
        volet_libelle: evaluationInfo.volet_libelle,
        periode_libelle: periode.libelle || `Du ${periode.date_debut} au ${periode.date_fin}`,
        date_evaluation: evaluationInfo.date_evaluation,
        date_soumission: evaluationInfo.created_at,
      },
      rubriques: rubriquesResult.rows.map((row) => ({
        rubrique_id: row.rubrique_id,
        numero: row.numero,
        libelle: row.libelle,
        composante_evaluee: row.composante_evaluee,
        criteres_indicateurs: row.criteres_indicateurs,
        mode_verification: row.mode_verification,
        note: row.note,
        commentaire: row.commentaire,
        date_evaluation: row.date_evaluation,
        created_at: row.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching evaluation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'évaluation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const controleurId = searchParams.get('controleurId');
    const voletId = searchParams.get('voletId');
    const periodeId = searchParams.get('periodeId');
    const etablissementId = searchParams.get('etablissementId');
    const villeId = searchParams.get('villeId');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    const pool = getPool();
    await pool.query('BEGIN');

    try {
      if (deleteAll) {
        // Soft delete : marquer toutes les évaluations comme supprimées
        const result = await pool.query('UPDATE evaluation SET deleted_at = NOW() WHERE deleted_at IS NULL RETURNING id');
        await pool.query('COMMIT');
        return NextResponse.json({
          success: true,
          deleted: result.rowCount,
          message: `${result.rowCount} évaluation(s) supprimée(s)`,
        });
      } else {
        // Supprimer une évaluation spécifique
        if (!controleurId || !voletId || !periodeId || !etablissementId || !villeId) {
          await pool.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Tous les paramètres sont requis' },
            { status: 400 }
          );
        }

        // Trouver la mission correspondante à la période
        const periodeResult = await pool.query(
          'SELECT id, date_debut, date_fin FROM periode WHERE id = $1',
          [parseInt(periodeId, 10)]
        );

        if (periodeResult.rows.length === 0) {
          await pool.query('ROLLBACK');
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
          await pool.query('ROLLBACK');
          return NextResponse.json({
            success: true,
            deleted: 0,
            message: 'Aucune évaluation trouvée',
          });
        }

        const missionId = missionResult.rows[0].id;

        // Soft delete : marquer les évaluations comme supprimées
        const result = await pool.query(
          `UPDATE evaluation SET deleted_at = NOW()
           WHERE mission_id = $1
             AND ville_id = $2
             AND etablissement_visite_id = $3
             AND controleur_id = $4
             AND volet_id = $5
             AND deleted_at IS NULL`,
          [
            missionId,
            parseInt(villeId, 10),
            parseInt(etablissementId, 10),
            parseInt(controleurId, 10),
            parseInt(voletId, 10),
          ]
        );

        await pool.query('COMMIT');
        return NextResponse.json({
          success: true,
          deleted: result.rowCount,
          message: `${result.rowCount} évaluation(s) supprimée(s)`,
        });
      }
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Error deleting evaluation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

