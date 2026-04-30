import { readFileSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import { getPool, closePool } from '../lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function updateRubriquesFromExcel() {
  const pool = getPool();

  try {
    console.log('Lecture du fichier synthese.xlsx...');
    const workbook = XLSX.readFile(join(__dirname, '../synthese.xlsx'));

    // Mapper les feuilles aux codes de volets
    const voletMapping: Record<string, string> = {
      'FI': 'FI',
      'F_QS': 'F_QS',
      'F_GAB': 'F_GAB',
    };

    for (const [sheetName, voletCode] of Object.entries(voletMapping)) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.log(`⚠️  Feuille "${sheetName}" non trouvée, ignorée`);
        continue;
      }

      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      console.log(`\n📋 Traitement de la feuille "${sheetName}" (${data.length} lignes)`);

      // Trouver les indices des colonnes (chercher dans plusieurs lignes si nécessaire)
      let headerRowIndex = 0;
      let composanteIndex = -1;
      let criteresIndex = -1;
      let modeIndex = -1;

      // Chercher les colonnes dans les premières lignes
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
        console.log(`   Première ligne:`, data[0]?.slice(0, 5));
        console.log(`   Composante: ${composanteIndex}, Critères: ${criteresIndex}, Mode: ${modeIndex}`);
        continue;
      }

      console.log(`   Colonnes trouvées à la ligne ${headerRowIndex + 1}: Composante=${composanteIndex + 1}, Critères=${criteresIndex + 1}, Mode=${modeIndex + 1}`);

      // Récupérer le volet
      const voletResult = await pool.query("SELECT id FROM volet WHERE code = $1", [voletCode]);
      if (voletResult.rows.length === 0) {
        console.log(`⚠️  Volet "${voletCode}" non trouvé`);
        continue;
      }
      const voletId = voletResult.rows[0].id;

      // Traiter les lignes de données (ignorer les lignes d'en-tête)
      let updatedCount = 0;
      let numeroRubrique = 1; // Numéro séquentiel si pas trouvé dans les données
      
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const composante = row[composanteIndex] ? String(row[composanteIndex]).trim() : null;
        const criteres = row[criteresIndex] ? String(row[criteresIndex]).trim() : null;
        const mode = row[modeIndex] ? String(row[modeIndex]).trim() : null;

        if (!composante || composante.length === 0) continue;
        
        // Essayer d'extraire le numéro depuis la composante (ex: "1– Gouvernance interne" ou "1. Gouvernance")
        let numero: number | null = null;
        const numeroMatch = composante.match(/^(\d+)[–\-\.]/);
        if (numeroMatch) {
          numero = parseInt(numeroMatch[1], 10);
        } else {
          // Si pas de numéro dans la composante, chercher dans la première colonne
          const firstCell = row[0] ? String(row[0]).trim() : null;
          if (firstCell && /^\d+$/.test(firstCell)) {
            numero = parseInt(firstCell, 10);
          } else {
            // Utiliser le numéro séquentiel
            numero = numeroRubrique;
          }
        }

        if (numero < 1 || numero > 12) {
          console.log(`⚠️  Numéro invalide: ${numero} pour "${composante}"`);
          continue;
        }

        numeroRubrique = numero + 1; // Incrémenter pour la prochaine itération

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
        console.log(`  ✓ Rubrique ${numero} mise à jour: ${composante.substring(0, 50)}...`);
      }

      console.log(`✅ ${updatedCount} rubriques mises à jour pour le volet ${voletCode}`);
    }

    console.log('\n✅ Mise à jour terminée!');
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

updateRubriquesFromExcel();

