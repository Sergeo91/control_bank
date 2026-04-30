import { getPool, closePool } from '../lib/db';
import { hashPassword } from '../lib/auth';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const pool = getPool();

  try {
    console.log('Démarrage du seed...');

    // Créer les missions (périodes)
    await pool.query(
      `INSERT INTO mission (nom, date_debut, date_fin)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      ['Mission NATITINGOU', '2025-11-17', '2025-11-21']
    );
    console.log('✓ Mission NATITINGOU créée');

    await pool.query(
      `INSERT INTO mission (nom, date_debut, date_fin)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      ['Mission BOHICON', '2025-11-24', '2025-11-28']
    );
    console.log('✓ Mission BOHICON créée');

    // Créer les établissements pour NATITINGOU
    const villeNatitingou = await pool.query("SELECT id FROM ville WHERE nom = 'NATITINGOU'");
    if (villeNatitingou.rows.length > 0) {
      const villeId = villeNatitingou.rows[0].id;
      const etablissementsNatitingou = ['BOA', 'ECOBANK', 'CORIS'];

      for (const etab of etablissementsNatitingou) {
        await pool.query(
          `INSERT INTO etablissement_visite (nom, ville_id)
           VALUES ($1, $2)
           ON CONFLICT (nom, ville_id) DO NOTHING`,
          [etab, villeId]
        );
      }
      console.log('✓ Établissements NATITINGOU créés');
    }

    // Créer les établissements pour BOHICON
    const villeBohicon = await pool.query("SELECT id FROM ville WHERE nom = 'BOHICON'");
    if (villeBohicon.rows.length > 0) {
      const villeId = villeBohicon.rows[0].id;
      const etablissementsBohicon = [
        'BOA',
        'ECOBANK',
        'CORIS',
        'UBA',
        'NSIA',
        'BSIC',
        'BGFI',
        'ORABANK',
        'BANQUE ATLANTIQUE',
      ];

      for (const etab of etablissementsBohicon) {
        await pool.query(
          `INSERT INTO etablissement_visite (nom, ville_id)
           VALUES ($1, $2)
           ON CONFLICT (nom, ville_id) DO NOTHING`,
          [etab, villeId]
        );
      }
      console.log('✓ Établissements BOHICON créés');
    }

    // Créer les rubriques pour chaque volet
    // Volet 1: Fonctionnement Interne (FI)
    const voletFI = await pool.query("SELECT id FROM volet WHERE code = 'FI'");
    if (voletFI.rows.length > 0) {
      const voletFIId = voletFI.rows[0].id;
      const rubriquesFI = [
        'Organisation et structure',
        'Processus internes',
        'Gestion des risques',
        'Contrôles internes',
        'Système d\'information',
        'Formation du personnel',
        'Documentation',
        'Communication interne',
        'Planification',
        'Suivi et reporting',
        'Conformité réglementaire',
        'Amélioration continue',
      ];

      for (let i = 0; i < rubriquesFI.length; i++) {
        await pool.query(
          `INSERT INTO rubrique (volet_id, numero, libelle)
           VALUES ($1, $2, $3)
           ON CONFLICT (volet_id, numero) DO NOTHING`,
          [voletFIId, i + 1, rubriquesFI[i]]
        );
      }
      console.log('✓ Rubriques FI créées');
    }

    // Volet 2: Qualité de Service (F_QS)
    const voletQS = await pool.query("SELECT id FROM volet WHERE code = 'F_QS'");
    if (voletQS.rows.length > 0) {
      const voletQSId = voletQS.rows[0].id;
      const rubriquesQS = [
        'Accueil et orientation',
        'Temps d\'attente',
        'Disponibilité des services',
        'Qualité de l\'information',
        'Professionnalisme du personnel',
        'Accessibilité',
        'Résolution des problèmes',
        'Satisfaction client',
        'Communication',
        'Innovation',
        'Fidélisation',
        'Image de marque',
      ];

      for (let i = 0; i < rubriquesQS.length; i++) {
        await pool.query(
          `INSERT INTO rubrique (volet_id, numero, libelle)
           VALUES ($1, $2, $3)
           ON CONFLICT (volet_id, numero) DO NOTHING`,
          [voletQSId, i + 1, rubriquesQS[i]]
        );
      }
      console.log('✓ Rubriques F_QS créées');
    }

    // Volet 3: GAB
    const voletGAB = await pool.query("SELECT id FROM volet WHERE code = 'F_GAB'");
    if (voletGAB.rows.length > 0) {
      const voletGABId = voletGAB.rows[0].id;
      const rubriquesGAB = [
        'Disponibilité',
        'Fonctionnement technique',
        'Sécurité',
        'Accessibilité',
        'Maintenance',
        'Information utilisateur',
        'Diversité des services',
        'Horaires d\'utilisation',
        'Fiabilité',
        'Support client',
        'Innovation',
        'Satisfaction utilisateur',
      ];

      for (let i = 0; i < rubriquesGAB.length; i++) {
        await pool.query(
          `INSERT INTO rubrique (volet_id, numero, libelle)
           VALUES ($1, $2, $3)
           ON CONFLICT (volet_id, numero) DO NOTHING`,
          [voletGABId, i + 1, rubriquesGAB[i]]
        );
      }
      console.log('✓ Rubriques F_GAB créées');
    }

    // Créer l'utilisateur admin par défaut
    // Utiliser ADMIN_PASSWORD si défini, sinon utiliser la valeur par défaut pour le développement local
    const adminEmail = 'sergeobusiness1@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await hashPassword(adminPassword);
    
    try {
      await pool.query(
        `INSERT INTO users (email, password_hash, nom, prenom, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()`,
        [adminEmail.toLowerCase(), passwordHash, 'Admin', 'Système', 'admin', true]
      );
      console.log('✓ Utilisateur admin créé/mis à jour');
    } catch (error: any) {
      // Si la table n'existe pas encore, on ignore l'erreur
      if (error.code === '42P01') {
        console.log('⚠️  Table users non trouvée, création de l\'utilisateur ignorée (exécutez d\'abord les migrations)');
      } else {
        throw error;
      }
    }

    console.log('Seed terminé avec succès!');
  } catch (error) {
    console.error('Erreur lors du seed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

seed();

