import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';

// Vérifier si les rubriques ont déjà des données chargées
async function hasRubriquesData(): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT COUNT(*) as count 
     FROM rubrique 
     WHERE criteres_indicateurs IS NOT NULL 
       AND criteres_indicateurs != '' 
       AND mode_verification IS NOT NULL 
       AND mode_verification != ''`
  );
  return parseInt(result.rows[0].count) > 0;
}

export async function POST(request: NextRequest) {
  try {
    // Vérification simple : cette route est accessible depuis /admin uniquement
    // En production, vous pourriez ajouter une authentification plus robuste
    // Pour l'instant, on accepte toutes les requêtes POST depuis /admin

    const pool = getPool();

    // Vérifier si les données sont déjà chargées
    const alreadyLoaded = await hasRubriquesData();
    if (alreadyLoaded) {
      return NextResponse.json({
        success: true,
        message: 'Les données des rubriques sont déjà chargées',
        skipped: true
      });
    }

    console.log('Lecture du fichier synthese.xlsx...');
    const workbook = XLSX.readFile(join(process.cwd(), 'synthese.xlsx'));

    // Mapper les feuilles aux codes de volets
    const voletMapping: Record<string, string> = {
      'FI': 'FI',
      'F_QS': 'F_QS',
      'F_GAB': 'F_GAB',
    };

    let totalUpdated = 0;

    for (const [sheetName, voletCode] of Object.entries(voletMapping)) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.log(`⚠️  Feuille "${sheetName}" non trouvée, ignorée`);
        continue;
      }

      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      console.log(`\n📋 Traitement de la feuille "${sheetName}" (${data.length} lignes)`);

      // Trouver les indices des colonnes
      let headerRowIndex = 0;
      let composanteIndex = -1;
      let criteresIndex = -1;
      let modeIndex = -1;

      for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
        const row = data[rowIdx] || [];
        composanteIndex = row.findIndex((h: any) => 
          h && String(h).toLowerCase().includes('composante')
        );
        criteresIndex = row.findIndex((h: any) => 
          h && (String(h).toLowerCase().includes('critère') || 
                String(h).toLowerCase().includes('indicateur') ||
                String(h).toLowerCase().includes('critere'))
        );
        modeIndex = row.findIndex((h: any) => 
          h && (String(h).toLowerCase().includes('mode') || 
                String(h).toLowerCase().includes('vérification') ||
                String(h).toLowerCase().includes('verification'))
        );

        if (composanteIndex !== -1 && criteresIndex !== -1 && modeIndex !== -1) {
          headerRowIndex = rowIdx;
          break;
        }
      }

      if (composanteIndex === -1 || criteresIndex === -1 || modeIndex === -1) {
        console.log(`⚠️  Colonnes non trouvées dans "${sheetName}"`);
        continue;
      }

      // Récupérer le volet
      const voletResult = await pool.query("SELECT id FROM volet WHERE code = $1", [voletCode]);
      if (voletResult.rows.length === 0) {
        console.log(`⚠️  Volet "${voletCode}" non trouvé`);
        continue;
      }
      const voletId = voletResult.rows[0].id;

      // Traiter les lignes de données
      let updatedCount = 0;
      let numeroRubrique = 1;
      
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const composante = row[composanteIndex] ? String(row[composanteIndex]).trim() : null;
        const criteres = row[criteresIndex] ? String(row[criteresIndex]).trim() : null;
        const mode = row[modeIndex] ? String(row[modeIndex]).trim() : null;

        if (!composante || composante.length === 0) continue;
        
        let numero: number | null = null;
        const numeroMatch = composante.match(/^(\d+)[–\-\.]/);
        if (numeroMatch) {
          numero = parseInt(numeroMatch[1], 10);
        } else {
          const firstCell = row[0] ? String(row[0]).trim() : null;
          if (firstCell && /^\d+$/.test(firstCell)) {
            numero = parseInt(firstCell, 10);
          } else {
            numero = numeroRubrique;
          }
        }

        if (numero < 1 || numero > 12) {
          continue;
        }

        numeroRubrique = numero + 1;

        // Mettre à jour la rubrique
        await pool.query(
          `UPDATE rubrique 
           SET composante_evaluee = $1, 
               criteres_indicateurs = $2, 
               mode_verification = $3
           WHERE volet_id = $4 AND numero = $5`,
          [composante, criteres || null, mode || null, voletId, numero]
        );

        updatedCount++;
      }

      totalUpdated += updatedCount;
      console.log(`✅ ${updatedCount} rubriques mises à jour pour le volet ${voletCode}`);
    }

    return NextResponse.json({
      success: true,
      message: `✅ ${totalUpdated} rubriques mises à jour avec succès`,
      updated: totalUpdated
    });

  } catch (error: any) {
    console.error('Erreur lors de la mise à jour:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erreur lors de la mise à jour des rubriques' 
      },
      { status: 500 }
    );
  }
}

