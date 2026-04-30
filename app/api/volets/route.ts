import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT v.id, v.code, v.libelle, v.ordre,
              json_agg(
                json_build_object(
                  'id', r.id,
                  'numero', r.numero,
                  'libelle', r.libelle,
                  'composante_evaluee', r.composante_evaluee,
                  'criteres_indicateurs', r.criteres_indicateurs,
                  'mode_verification', r.mode_verification
                ) ORDER BY r.numero
              ) FILTER (WHERE r.id IS NOT NULL) as rubriques
       FROM volet v
       LEFT JOIN rubrique r ON v.id = r.volet_id
       GROUP BY v.id, v.code, v.libelle, v.ordre
       ORDER BY v.ordre`
    );

    return NextResponse.json({ volets: result.rows });
  } catch (error) {
    console.error('Error fetching volets:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des volets' },
      { status: 500 }
    );
  }
}

