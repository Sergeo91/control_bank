import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool, closePool } from '../lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  try {
    console.log('Démarrage de la migration...');
    
    // Vérifier que DATABASE_URL est défini
    if (!process.env.DATABASE_URL) {
      console.error('❌ ERREUR: La variable d\'environnement DATABASE_URL n\'est pas définie.');
      console.error('');
      console.error('Veuillez créer un fichier .env à la racine du projet avec:');
      console.error('DATABASE_URL=postgresql://user:password@localhost:5432/mission_suivi_banque');
      console.error('');
      process.exit(1);
    }

    console.log('Connexion à la base de données...');
    const pool = getPool();
    
    // Tester la connexion
    try {
      await pool.query('SELECT NOW()');
      console.log('✓ Connexion à la base de données réussie');
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ ERREUR: Impossible de se connecter à PostgreSQL.');
        console.error('');
        console.error('Vérifications à effectuer:');
        console.error('1. PostgreSQL est-il installé et démarré ?');
        console.error('   Sur macOS: brew services start postgresql@14');
        console.error('   Sur Linux: sudo systemctl start postgresql');
        console.error('');
        console.error('2. La base de données existe-t-elle ?');
        console.error('   Créez-la avec: createdb mission_suivi_banque');
        console.error('');
        console.error('3. Les identifiants dans DATABASE_URL sont-ils corrects ?');
        console.error(`   DATABASE_URL actuel: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
        process.exit(1);
      }
      throw error;
    }

    // Lire les fichiers SQL de migration dans l'ordre
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_add_rubrique_columns_and_periodes.sql',
      '003_create_users_table.sql',
      '004_create_app_settings_table.sql',
      '005_add_soft_delete.sql',
    ];
    
    let allSqlContent = '';
    for (const migrationFile of migrationFiles) {
      const migrationPath = join(__dirname, '../migrations', migrationFile);
      try {
        const sqlFile = readFileSync(migrationPath, 'utf-8');
        allSqlContent += '\n' + sqlFile;
        console.log(`✓ Fichier de migration chargé: ${migrationFile}`);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(`⚠️  Fichier de migration non trouvé: ${migrationFile} (ignoré)`);
        } else {
          throw error;
        }
      }
    }
    
    const sqlFile = allSqlContent;

    // Exécuter les commandes SQL une par une
    // On divise par les points-virgules mais on doit être plus intelligent
    // pour gérer les commentaires et les commandes multi-lignes
    const lines = sqlFile.split('\n');
    let currentCommand = '';
    let commandCount = 0;
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Ignorer les lignes vides et les commentaires
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue;
      }

      currentCommand += ' ' + trimmedLine;

      // Si la ligne se termine par un point-virgule, exécuter la commande
      if (trimmedLine.endsWith(';')) {
        const command = currentCommand.trim();
        currentCommand = '';

        if (!command || command === ';') {
          continue;
        }

        commandCount++;
        try {
          await pool.query(command);
          successCount++;
          // Afficher seulement les commandes importantes
          if (command.toUpperCase().startsWith('CREATE TABLE')) {
            const tableName = command.match(/CREATE TABLE.*?(\w+)/i)?.[1];
            console.log(`✓ Table créée/vérifiée: ${tableName || '?'}`);
          }
        } catch (error: any) {
          // Ignorer les erreurs de "table/index already exists" et "unique violation"
          // 42P07 = relation already exists (table ou index)
          // 23505 = unique violation (contrainte unique)
          // 42710 = duplicate object (index déjà existant)
          const isIgnorableError =
            error.code === '42P07' ||
            error.code === '23505' ||
            error.code === '42710' ||
            (error.message && (
              error.message.includes('already exists') ||
              error.message.includes('duplicate key')
            ));

          if (isIgnorableError) {
            skippedCount++;
            // Ne rien afficher pour les erreurs ignorables
          } else {
            errorCount++;
            console.error(`❌ Erreur (${error.code || 'N/A'}):`, error.message);
            console.error('   Commande:', command.substring(0, 150) + '...');
          }
        }
      }
    }

    // Exécuter toute commande restante
    if (currentCommand.trim()) {
      commandCount++;
      try {
        await pool.query(currentCommand.trim());
        successCount++;
      } catch (error: any) {
        const isIgnorableError =
          error.code === '42P07' ||
          error.code === '23505' ||
          error.code === '42710' ||
          (error.message && error.message.includes('already exists'));

        if (!isIgnorableError) {
          errorCount++;
          console.error(`❌ Erreur:`, error.message);
        } else {
          skippedCount++;
        }
      }
    }

    console.log('\n📊 Résumé de la migration:');
    console.log(`   Commandes exécutées: ${successCount}`);
    console.log(`   Erreurs ignorées (déjà existant): ${skippedCount}`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Erreurs critiques: ${errorCount}`);
    }
    console.log('Migration terminée!');
  } catch (error) {
    console.error('Erreur fatale lors de la migration:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();

