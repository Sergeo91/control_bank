import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Rubriques d'un volet (requête simple, fiable en prod — évite les soucis de sérialisation json_agg).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const voletId = parseInt(params.id, 10);
    if (Number.isNaN(voletId)) {
      return NextResponse.json({ error: 'ID volet invalide' }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT id, numero, libelle, composante_evaluee, criteres_indicateurs, mode_verification
       FROM rubrique
       WHERE volet_id = $1
       ORDER BY numero`,
      [voletId]
    );

    const rubriques = result.rows.map((row) => ({
      id: Number(row.id),
      numero: Number(row.numero),
      libelle: row.libelle,
      composante_evaluee: row.composante_evaluee,
      criteres_indicateurs: row.criteres_indicateurs,
      mode_verification: row.mode_verification,
    }));

    return NextResponse.json({ rubriques });
  } catch (error) {
    console.error('Error fetching rubriques for volet:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des rubriques' },
      { status: 500 }
    );
  }
}
