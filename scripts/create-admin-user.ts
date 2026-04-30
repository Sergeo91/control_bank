import { getPool } from '../lib/db';
import { hashPassword, getUserByEmail } from '../lib/auth';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function createAdminUser() {
  const pool = getPool();
  
  try {
    const adminEmail = 'sergeobusiness1@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('❌ ERREUR: ADMIN_PASSWORD n\'est pas défini dans les variables d\'environnement');
      console.error('   Veuillez définir ADMIN_PASSWORD dans votre fichier .env.local ou .env');
      process.exit(1);
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await getUserByEmail(adminEmail);
    
    if (existingUser) {
      console.log(`✅ L'utilisateur admin avec l'email ${adminEmail} existe déjà.`);
      console.log('   Mise à jour du mot de passe...');
      
      const passwordHash = await hashPassword(adminPassword);
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, updated_at = NOW() 
         WHERE email = $2`,
        [passwordHash, adminEmail]
      );
      
      console.log('✅ Mot de passe mis à jour avec succès.');
    } else {
      console.log(`📝 Création de l'utilisateur admin avec l'email ${adminEmail}...`);
      
      const passwordHash = await hashPassword(adminPassword);
      await pool.query(
        `INSERT INTO users (email, password_hash, nom, prenom, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [adminEmail, passwordHash, 'Admin', 'User', 'admin', true]
      );
      
      console.log('✅ Utilisateur admin créé avec succès.');
    }
    
    console.log(`\n📧 Email: ${adminEmail}`);
    console.log('🔑 Mot de passe: (défini dans ADMIN_PASSWORD)');
    console.log('👤 Rôle: admin\n');
    
  } catch (error: any) {
    console.error('❌ Erreur lors de la création de l\'utilisateur admin:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdminUser();

