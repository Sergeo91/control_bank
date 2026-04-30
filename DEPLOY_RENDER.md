# Guide de Déploiement sur Render

Guide étape par étape pour déployer votre application sur Render.

## 🚀 Déploiement Rapide

### Étape 1 : Créer un compte Render

1. Allez sur https://render.com
2. Créez un compte (gratuit)
3. Connectez votre compte GitHub

### Étape 2 : Créer la base de données PostgreSQL

1. Dans votre dashboard Render, cliquez sur **"New +"**
2. Sélectionnez **"PostgreSQL"**
3. Configuration :
   - **Name** : `mission-suivi-banque-db`
   - **Database** : `mission_suivi_banque`
   - **User** : `mission_banque_user`
   - **Plan** : Free (ou Starter pour éviter le sleep)
4. Cliquez sur **"Create Database"**
5. Notez la `Internal Database URL` (sera utilisée automatiquement)

### Étape 3 : Créer le service web

#### Option A : Utiliser render.yaml (Recommandé)

1. **IMPORTANT** : Créez d'abord la base de données PostgreSQL (Étape 2 ci-dessus)
2. Assurez-vous que `render.yaml` est dans votre dépôt
3. Dans Render, cliquez sur **"New +"** > **"Blueprint"**
4. Connectez votre dépôt GitHub
5. Render détectera automatiquement `render.yaml`
6. Cliquez sur **"Apply"** pour créer le service web
7. **Après le déploiement** : Allez dans votre service web > **Environment** > **Link Resource** > Sélectionnez votre base de données PostgreSQL
   - Cela ajoutera automatiquement `DATABASE_URL` dans les variables d'environnement

#### Option B : Configuration manuelle

1. Cliquez sur **"New +"** > **"Web Service"**
2. Connectez votre dépôt GitHub
3. Sélectionnez le dépôt `mission_suivi_banque`
4. Configuration :
   - **Name** : `mission-suivi-banque`
   - **Environment** : `Docker`
   - **Region** : Choisissez la région la plus proche
   - **Branch** : `main`
   - **Root Directory** : `/` (racine)
   - **Dockerfile Path** : `./Dockerfile`
   - **Docker Context** : `.`
   - **Plan** : Free

5. **Variables d'environnement** :
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = Cliquez sur **"Link Resource"** et sélectionnez votre base de données PostgreSQL
   - `NEXT_PUBLIC_APP_URL` = Votre URL Render (ex: `https://mission-suivi-banque.onrender.com`)
   - `ADMIN_PASSWORD` = `admin123` (changez en production)

6. Cliquez sur **"Create Web Service"**

### Étape 4 : Charger les données depuis synthese.xlsx

**IMPORTANT** : Après le déploiement, vous devez charger les données des rubriques depuis le fichier `synthese.xlsx`.

#### Méthode 1 : Via l'interface Admin (Recommandé pour Plan Free) ⭐

**Cette méthode fonctionne même avec le plan gratuit de Render (pas besoin de Shell)** :

1. Accédez à votre application : `https://mission-suivi-banque.onrender.com/admin`
2. L'onglet **"Synthèse"** est sélectionné par défaut
3. Vous verrez une alerte bleue avec des informations
4. Cliquez sur le bouton **"Charger les données des rubriques"** (à côté du bouton "Exporter")
5. Attendez quelques secondes - un message de succès s'affichera
6. Les données des colonnes "Critères / Indicateurs" et "Mode de vérification" seront maintenant dans la base de données

**Note** : Le script essaie aussi de charger automatiquement les données au démarrage si le fichier `synthese.xlsx` est présent.

#### Méthode 2 : Utiliser Render Shell (Plan Payant uniquement)

Si vous avez accès au Shell (plan payant) :

1. Dans votre service web `mission-suivi-banque`, allez dans l'onglet **"Shell"**
2. Exécutez :
   ```bash
   npm run update-rubriques
   ```
3. Attendez que le script se termine

#### Méthode 3 : Via Render CLI (si installé)

Si vous avez Render CLI installé localement :
```bash
render exec mission-suivi-banque -- npm run update-rubriques
```

> 💡 **Pour plus de détails**, consultez [`CHARGER_DONNEES_RUBRIQUES.md`](./CHARGER_DONNEES_RUBRIQUES.md)

### Étape 5 : Attendre le déploiement

Render va :
1. ✅ Construire l'image Docker
2. ✅ Exécuter automatiquement les migrations (via `deploy-entrypoint.sh`)
3. ✅ Exécuter le seed
4. ✅ Démarrer l'application

### Étape 6 : Obtenir votre URL

Une fois le déploiement terminé :
1. Render génère automatiquement une URL : `https://mission-suivi-banque.onrender.com`
2. Mettez à jour `NEXT_PUBLIC_APP_URL` avec cette URL si nécessaire
3. Redéployez pour appliquer les changements

## 🔧 Configuration Avancée

### Éviter le "Sleep" (Plan Free)

Le plan gratuit "sleep" après 15 minutes d'inactivité. Pour éviter cela :

1. **Option 1** : Utiliser un service de monitoring (gratuit)
   - UptimeRobot : https://uptimerobot.com
   - Ping votre URL toutes les 5 minutes

2. **Option 2** : Passer au plan Starter ($7/mois)
   - Pas de sleep
   - Plus de ressources

### Migrer les données depuis Railway

Si vous avez des données sur Railway à migrer :

```bash
# 1. Exporter depuis Railway
pg_dump $RAILWAY_DATABASE_URL > backup.sql

# 2. Importer vers Render
# Récupérez la DATABASE_URL depuis Render > Database > Internal Database URL
psql $RENDER_DATABASE_URL < backup.sql
```

## 🐛 Dépannage

### L'application ne démarre pas

1. Vérifiez les logs dans Render > Logs
2. Assurez-vous que `DATABASE_URL` est bien lié à votre base de données
3. Vérifiez que toutes les variables d'environnement sont définies

### Les migrations échouent

Les migrations s'exécutent automatiquement au démarrage. Si elles échouent :
1. Consultez les logs pour voir l'erreur exacte
2. Vous pouvez exécuter manuellement via Render Shell :
   - Allez dans votre service > **Shell**
   - `npm run migrate`

### Les colonnes "Critères / Indicateurs" et "Mode de vérification" sont vides dans l'export

Cela signifie que les données n'ont pas été chargées depuis `synthese.xlsx`. Pour corriger :

1. Assurez-vous que le fichier `synthese.xlsx` est présent dans votre dépôt GitHub
2. Exécutez le script de mise à jour via Render Shell :
   - Allez dans votre service web > **Shell**
   - Exécutez : `npm run update-rubriques`
3. Vérifiez les logs pour confirmer que les données ont été chargées

### L'application "sleep" trop souvent

- Utilisez UptimeRobot pour ping votre URL
- Ou passez au plan Starter

## 📝 Notes Importantes

- **Plan Free** : Services "sleep" après 15 min d'inactivité
- **PostgreSQL Free** : Valable 90 jours, puis $7/mois ou recréer
- **Build Time** : Limité à 90 minutes sur le plan gratuit
- **Bandwidth** : 100GB/mois sur le plan gratuit
- **Fichier synthese.xlsx** : Doit être présent dans le dépôt pour charger les données des rubriques

## 🔄 Mise à jour

Pour mettre à jour l'application :
1. Poussez vos changements sur GitHub
2. Render détectera automatiquement et redéploiera
3. Les migrations seront réexécutées automatiquement

## 📚 Ressources

- Documentation Render : https://render.com/docs
- Support Render : https://render.com/docs/support
