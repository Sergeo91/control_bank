#!/bin/sh

echo "🚀 Démarrage de l'application..."

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERREUR: DATABASE_URL n'est pas défini"
  echo ""
  echo "📋 Instructions pour configurer DATABASE_URL:"
  echo "1. Assurez-vous d'avoir créé un service PostgreSQL"
  echo "2. Vérifiez que le service PostgreSQL et le service web sont liés"
  echo "3. La plateforme devrait injecter automatiquement DATABASE_URL"
  echo ""
  echo "🔍 Variables d'environnement disponibles:"
  env | grep -E "(DATABASE|POSTGRES|RAILWAY|RENDER|FLY)" || echo "Aucune variable de base de données trouvée"
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

# Charger les données des rubriques depuis synthese.xlsx (seulement si pas déjà chargées)
echo "📋 Vérification des données des rubriques..."
if [ -f "synthese.xlsx" ]; then
  echo "🔄 Chargement des données depuis synthese.xlsx..."
  npm run update-rubriques || echo "⚠️  Données déjà chargées ou erreur (non bloquant)"
else
  echo "⚠️  Fichier synthese.xlsx non trouvé, les colonnes Critères/Indicateurs et Mode de vérification seront vides"
  echo "   Pour charger les données, utilisez l'endpoint /api/admin/update-rubriques"
fi

# Créer l'utilisateur admin si ADMIN_PASSWORD est défini
if [ -n "$ADMIN_PASSWORD" ]; then
  echo "👤 Création/mise à jour de l'utilisateur admin..."
  npm run create-admin || echo "⚠️  Erreur lors de la création de l'utilisateur admin (non bloquant)"
else
  echo "⚠️  ADMIN_PASSWORD n'est pas défini, l'utilisateur admin ne sera pas créé"
  echo "   Pour créer l'utilisateur admin, définissez ADMIN_PASSWORD et exécutez: npm run create-admin"
fi

echo "✅ Initialisation terminée!"

# Démarrer l'application Next.js
echo "🚀 Démarrage du serveur Next.js..."
exec node server.js

