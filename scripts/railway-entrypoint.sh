#!/bin/sh

echo "🚀 Démarrage de l'application sur Railway..."

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERREUR: DATABASE_URL n'est pas défini"
  echo ""
  echo "📋 Instructions pour configurer DATABASE_URL sur Railway:"
  echo "1. Assurez-vous d'avoir créé un service PostgreSQL dans votre projet Railway"
  echo "2. Vérifiez que le service PostgreSQL et le service web sont dans le MÊME projet Railway"
  echo "3. Railway injecte automatiquement DATABASE_URL quand les services sont dans le même projet"
  echo "4. Si DATABASE_URL n'apparaît pas automatiquement:"
  echo "   - Allez dans votre service web > Variables"
  echo "   - Cliquez sur 'New Variable'"
  echo "   - Ajoutez une référence au service PostgreSQL:"
  echo "     Variable: DATABASE_URL"
  echo "     Value: ${{Postgres.DATABASE_URL}}"
  echo "   (Remplacez 'Postgres' par le nom de votre service PostgreSQL)"
  echo ""
  echo "🔍 Variables d'environnement disponibles:"
  env | grep -E "(RAILWAY|DATABASE|POSTGRES)" || echo "Aucune variable Railway/PostgreSQL trouvée"
  exit 1
fi

# Attendre que la base de données soit prête en testant la connexion
echo "⏳ Attente de la base de données..."
RETRIES=30
until node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()')
  .then(() => { pool.end(); process.exit(0); })
  .catch(() => { pool.end(); process.exit(1); });
" 2>/dev/null; do
  RETRIES=$((RETRIES-1))
  if [ $RETRIES -eq 0 ]; then
    echo "❌ Timeout: Impossible de se connecter à la base de données"
    exit 1
  fi
  echo "⏳ En attente de PostgreSQL... ($RETRIES tentatives restantes)"
  sleep 2
done

echo "✅ Base de données prête!"

# Exécuter les migrations
echo "🔄 Exécution des migrations..."
npm run migrate || echo "⚠️  Migrations déjà exécutées ou erreur (non bloquant)"

# Exécuter le seed (seulement si la base est vide)
echo "🌱 Exécution du seed..."
npm run seed || echo "⚠️  Seed déjà exécuté ou erreur (non bloquant)"

echo "✅ Initialisation terminée!"

# Démarrer l'application Next.js
echo "🚀 Démarrage du serveur Next.js..."
exec node server.js

