import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fonction pour obtenir l'appréciation à partir de la moyenne
function getAppreciation(moyenne: number, bareme: Array<{ note: number; libelle: string }>): string {
  const noteArrondie = Math.round(moyenne);
  const baremeItem = bareme.find((b) => b.note === noteArrondie);
  return baremeItem ? baremeItem.libelle : '';
}

// Fonction pour générer le nom de feuille Excel (max 31 caractères)
function generateSheetName(prefix: string, villeNom: string, etablissementNom: string): string {
  const villePrefix = villeNom.substring(0, 4).toUpperCase();
  // Tronquer l'établissement si nécessaire pour respecter la limite de 31 caractères
  const maxEtabLength = 31 - prefix.length - villePrefix.length - 1; // -1 pour le underscore
  const etabTruncated = etablissementNom.length > maxEtabLength
    ? etablissementNom.substring(0, maxEtabLength)
    : etablissementNom;
  return `${prefix}${villePrefix}_${etabTruncated}`;
}

export async function GET(request: NextRequest) {
  try {
    // Authentification supprimée - accès libre à /admin

    const missionId = request.nextUrl.searchParams.get('missionId');
    const villeId = request.nextUrl.searchParams.get('villeId');
    const etablissementId = request.nextUrl.searchParams.get('etablissementId');
    const controleurId = request.nextUrl.searchParams.get('controleurId');
    const voletId = request.nextUrl.searchParams.get('voletId');

    // Le volet est obligatoire pour l'export
    if (!voletId) {
      return NextResponse.json(
        { error: 'Le volet est obligatoire pour l\'export' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Récupérer le barème
    const baremeResult = await pool.query(
      'SELECT note, libelle FROM bareme ORDER BY note'
    );
    const bareme = baremeResult.rows;

    // Construire les conditions WHERE
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (missionId) {
      whereConditions.push(`e.mission_id = $${paramIndex}`);
      params.push(parseInt(missionId, 10));
      paramIndex++;
    }
    if (villeId) {
      whereConditions.push(`e.ville_id = $${paramIndex}`);
      params.push(parseInt(villeId, 10));
      paramIndex++;
    }
    if (etablissementId) {
      whereConditions.push(`e.etablissement_visite_id = $${paramIndex}`);
      params.push(parseInt(etablissementId, 10));
      paramIndex++;
    }
    if (controleurId) {
      whereConditions.push(`e.controleur_id = $${paramIndex}`);
      params.push(parseInt(controleurId, 10));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? whereConditions.join(' AND ')
      : '1=1';

    // Récupérer le volet sélectionné (obligatoire)
    const voletResult = await pool.query(
      'SELECT id, code, libelle, ordre FROM volet WHERE id = $1',
      [parseInt(voletId, 10)]
    );

    if (voletResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Volet non trouvé' },
        { status: 404 }
      );
    }

    const volet = voletResult.rows[0];

    // Déterminer le préfixe selon le volet
    let prefix = '';
    if (volet.code === 'FI') {
      prefix = 'Moy_FI_';
    } else if (volet.code === 'F_QS') {
      prefix = 'Moy_QS_';
    } else if (volet.code === 'F_GAB') {
      prefix = 'Moy_GAB_';
    } else {
      return NextResponse.json(
        { error: 'Code de volet non reconnu' },
        { status: 400 }
      );
    }

    // Créer un classeur Excel
    const workbook = XLSX.utils.book_new();

    // Récupérer les rubriques du volet avec toutes les colonnes nécessaires
    const rubriquesResult = await pool.query(
      `SELECT id, numero, libelle, composante_evaluee, criteres_indicateurs, mode_verification 
       FROM rubrique WHERE volet_id = $1 ORDER BY numero`,
      [volet.id]
    );
    const rubriques = rubriquesResult.rows;

    // Requête pour les moyennes par Ville et Établissement pour ce volet
    // On groupe par rubrique pour calculer la moyenne de chaque rubrique
    const voletParamIndex = params.length + 1;
    const finalParams = [...params, volet.id];
    
    // D'abord, récupérer toutes les évaluations pour ce volet
    const evaluationsQuery = `
      SELECT 
        v.id as ville_id,
        v.nom as ville_nom,
        et.id as etablissement_id,
        et.nom as etablissement_nom,
        e.rubrique_id,
        e.note
      FROM evaluation e
      JOIN ville v ON e.ville_id = v.id
      JOIN etablissement_visite et ON e.etablissement_visite_id = et.id
      WHERE ${whereClause} AND e.volet_id = $${voletParamIndex}
    `;
    
    const evaluationsResult = await pool.query(evaluationsQuery, finalParams);
    
    // Grouper par (ville_id, etablissement_id) et calculer les moyennes
    const groupedEvaluations: Record<string, {
      ville_id: number;
      ville_nom: string;
      etablissement_id: number;
      etablissement_nom: string;
      rubriques: Record<number, number[]>;
    }> = {};
    
    evaluationsResult.rows.forEach((row) => {
      const key = `${row.ville_id}_${row.etablissement_id}`;
      if (!groupedEvaluations[key]) {
        groupedEvaluations[key] = {
          ville_id: row.ville_id,
          ville_nom: row.ville_nom,
          etablissement_id: row.etablissement_id,
          etablissement_nom: row.etablissement_nom,
          rubriques: {},
        };
      }
      if (!groupedEvaluations[key].rubriques[row.rubrique_id]) {
        groupedEvaluations[key].rubriques[row.rubrique_id] = [];
      }
      groupedEvaluations[key].rubriques[row.rubrique_id].push(row.note);
    });
    
    // Convertir en format pour Excel
    const result = Object.values(groupedEvaluations).map((group) => {
      const row: any = {
        ville_id: group.ville_id,
        ville_nom: group.ville_nom,
        etablissement_id: group.etablissement_id,
        etablissement_nom: group.etablissement_nom,
      };
      
      // Calculer la moyenne pour chaque rubrique
      const allNotes: number[] = [];
      rubriques.forEach((rubrique) => {
        const notes = group.rubriques[rubrique.id] || [];
        const moyenne = notes.length > 0
          ? notes.reduce((sum, n) => sum + n, 0) / notes.length
          : null;
        row[`rubrique_${rubrique.numero}`] = moyenne;
        if (moyenne !== null) {
          allNotes.push(...notes);
        }
      });
      
      // Moyenne globale
      row.moyenne_5 = allNotes.length > 0
        ? allNotes.reduce((sum, n) => sum + n, 0) / allNotes.length
        : 0;
      
      return row;
    });

    // Grouper par combinaison (Ville, Établissement) et créer une feuille par combinaison
    const groupedData: Record<string, any[]> = {};
    result.forEach((row) => {
      const key = `${row.ville_id}_${row.etablissement_id}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    // Créer une feuille pour chaque combinaison (Ville, Établissement)
    for (const [key, rows] of Object.entries(groupedData)) {
      if (rows.length === 0) continue;

      const firstRow = rows[0];
      const sheetName = generateSheetName(prefix, firstRow.ville_nom, firstRow.etablissement_nom);

      // Préparer les données en format array of arrays pour Excel
      const excelRows: any[][] = [];

      // En-tête avec Volet, Ville, Établissement
      excelRows.push(['Volet:', volet.libelle]);
      excelRows.push(['Ville:', firstRow.ville_nom]);
      excelRows.push(['Établissement visité:', firstRow.etablissement_nom]);
      excelRows.push([]); // Ligne vide

      // En-têtes des colonnes exactes : "N°", "Composante évaluée", "Critères / Indicateurs", "Mode de vérification", "Moyenne / 5", "Observations"
      const headerRow: any[] = [
        'N°',
        'Composante évaluée',
        'Critères / Indicateurs',
        'Mode de vérification',
        'Moyenne / 5',
        'Observations'
      ];
      excelRows.push(headerRow);

      // Données - 12 lignes (une par rubrique)
      rubriques.forEach((rubrique) => {
        const moyenneRubrique = rows[0]?.[`rubrique_${rubrique.numero}`];
        const moyenne = moyenneRubrique !== null && moyenneRubrique !== undefined
          ? parseFloat(moyenneRubrique.toString())
          : 0;

        // Utiliser la composante évaluée telle quelle (sans numéro car la colonne N° existe déjà)
        let composante = rubrique.composante_evaluee || rubrique.libelle;
        // Retirer le numéro s'il existe déjà au début
        if (composante && composante.match(/^\d+[–-]\s*/)) {
          composante = composante.replace(/^\d+[–-]\s*/, '');
        }

        const dataRow: any[] = [
          rubrique.numero, // N°
          composante, // Composante évaluée (sans numéro)
          rubrique.criteres_indicateurs ?? '', // Critères / Indicateurs (utilise ?? pour gérer null/undefined)
          rubrique.mode_verification ?? '', // Mode de vérification (utilise ?? pour gérer null/undefined)
          moyenne > 0 ? moyenne.toFixed(2) : '', // Moyenne / 5
          moyenne > 0 ? getAppreciation(moyenne, bareme) : '' // Observations
        ];

        excelRows.push(dataRow);
      });

      // Créer la feuille Excel
      const worksheet = XLSX.utils.aoa_to_sheet(excelRows);

      // Ajuster la largeur des colonnes
      // Structure: 2 colonnes pour les en-têtes (label + valeur), puis 6 colonnes de données
      const colWidths: any[] = [
        { wch: 25 }, // Colonne des labels (Volet:, Ville:, etc.)
        { wch: 40 }, // Colonne des valeurs pour les en-têtes
        { wch: 5 },  // N°
        { wch: 35 }, // Composante évaluée
        { wch: 40 }, // Critères / Indicateurs
        { wch: 35 }, // Mode de vérification
        { wch: 12 }, // Moyenne / 5
        { wch: 30 }, // Observations
      ];
      worksheet['!cols'] = colWidths;

      // Ajouter la feuille au classeur
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    // Générer le buffer Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Retourner le fichier Excel
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="evaluations_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'export Excel' },
      { status: 500 }
    );
  }
}
