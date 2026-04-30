import { readFileSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import { getPool, closePool } from '../lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function updateBaremeFromExcel() {
  const pool = getPool();

  try {
    console.log('Lecture du fichier synthese.xlsx pour extraire le barème...');
    const workbook = XLSX.readFile(join(__dirname, '../synthese.xlsx'));

    const sheet = workbook.Sheets['BAREME'];
    if (!sheet) {
      console.error('⚠️  Feuille "BAREME" non trouvée dans synthese.xlsx');
      process.exit(1);
    }

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    console.log(`📋 Traitement de la feuille "BAREME" (${data.length} lignes)`);

    // Trouver les indices des colonnes
    let headerRowIndex = 0;
    let noteIndex = -1;
    let libelleIndex = -1;

    // Chercher les colonnes dans les premières lignes
    for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
      const row = data[rowIdx] || [];
      noteIndex = row.findIndex((h: any) => 
        h && (String(h).toLowerCase().includes('note') || 
             String(h).toLowerCase().includes('n°') ||
             String(h).trim() === '5' || String(h).trim() === '4' || 
             String(h).trim() === '3' || String(h).trim() === '2' || String(h).trim() === '1')
      );
      libelleIndex = row.findIndex((h: any) => 
        h && (String(h).toLowerCase().includes('libellé') || 
             String(h).toLowerCase().includes('libelle') ||
             String(h).toLowerCase().includes('appréciation') ||
             String(h).toLowerCase().includes('appreciation'))
      );

      if (noteIndex !== -1 && libelleIndex !== -1) {
        headerRowIndex = rowIdx;
        break;
      }
    }

    // Si pas trouvé, essayer de détecter automatiquement (première colonne = note, deuxième = libellé)
    if (noteIndex === -1 || libelleIndex === -1) {
      console.log('⚠️  Colonnes non trouvées avec les noms standards, tentative de détection automatique...');
      console.log('   Première ligne:', data[0]?.slice(0, 5));
      // Essayer la première ligne comme en-tête
      if (data.length > 0) {
        const firstRow = data[0] || [];
        // Chercher une colonne avec un nombre (note)
        for (let i = 0; i < firstRow.length; i++) {
          const val = String(firstRow[i] || '').trim();
          if (/^[1-5]$/.test(val)) {
            noteIndex = i;
            break;
          }
        }
        // La colonne suivante ou une colonne avec du texte long = libellé
        if (noteIndex !== -1) {
          libelleIndex = noteIndex + 1;
          headerRowIndex = 0;
        } else {
          // Essayer colonne 0 = note, colonne 1 = libellé
          noteIndex = 0;
          libelleIndex = 1;
          headerRowIndex = 0;
        }
      }
    }

    if (noteIndex === -1 || libelleIndex === -1) {
      console.error('⚠️  Impossible de trouver les colonnes dans "BAREME"');
      console.log('   Première ligne:', data[0]?.slice(0, 5));
      console.log('   Deuxième ligne:', data[1]?.slice(0, 5));
      process.exit(1);
    }

    console.log(`   Colonnes trouvées à la ligne ${headerRowIndex + 1}: Note=${noteIndex + 1}, Libellé=${libelleIndex + 1}`);

    // Vider la table bareme pour remplacer complètement
    await pool.query('DELETE FROM bareme');

    // Traiter les lignes de données
    let insertedCount = 0;
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const note = row[noteIndex];
      const libelle = row[libelleIndex] ? String(row[libelleIndex]).trim() : null;

      if (!note || !libelle || libelle.length === 0) continue;

      const noteNum = parseInt(String(note), 10);
      if (isNaN(noteNum) || noteNum < 1 || noteNum > 5) {
        console.log(`⚠️  Note invalide ignorée: ${note}`);
        continue;
      }

      // Utiliser exactement le libellé tel qu'il est dans Excel (sans transformation)
      await pool.query(
        `INSERT INTO bareme (note, libelle, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (note) DO UPDATE SET libelle = EXCLUDED.libelle, description = EXCLUDED.description`,
        [noteNum, libelle, libelle] // Utiliser exactement le libellé du fichier Excel
      );

      insertedCount++;
      console.log(`  ✓ Barème ${noteNum}: "${libelle}"`);
    }

    console.log(`\n✅ ${insertedCount} éléments de barème mis à jour!`);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du barème:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

updateBaremeFromExcel();

