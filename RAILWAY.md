# Guide de Déploiement Railway

Ce guide vous accompagne étape par étape pour déployer l'application Mission Suivi Banque sur Railway.

## 🚀 Déploiement Rapide

### Étape 1 : Préparer votre code

Assurez-vous que votre code est sur GitHub :

```bash
git add .
git commit -m "Préparation pour Railway"
git push origin main
```

### Étape 2 : Créer le projet Railway

1. Allez sur https://railway.app et connectez-vous
2. Cliquez sur **"New Project"**
3. Sélectionnez **"Deploy from GitHub repo"**
4. Choisissez votre dépôt `mission_suivi_banque`

### Étape 3 : Ajouter PostgreSQL

1. Dans votre projet Railway, cliquez sur **"+ New"**
2. Sélectionnez **"Database"** > **"Add PostgreSQL"**
3. Railway créera automatiquement une base de données
4. **IMPORTANT** : La variable `DATABASE_URL` devrait être automatiquement injectée dans votre service web

**Si `DATABASE_URL` n'est pas automatiquement disponible :**

1. Allez dans votre service web (celui qui déploie l'application)
2. Cliquez sur l'onglet **"Variables"**
3. Cliquez sur **"New Variable"**
4. Dans le champ **"Variable"**, entrez : `DATABASE_URL`
5. Dans le champ **"Value"**, cliquez sur **"Reference"** et sélectionnez votre service PostgreSQL
6. Railway vous proposera une syntaxe comme : `${{Postgres.DATABASE_URL}}`
   - Remplacez `Postgres` par le nom exact de votre service PostgreSQL (visible dans l'onglet **"Settings"** du service PostgreSQL)
7. Cliquez sur **"Add"**

**Alternative** : Vous pouvez aussi copier directement la valeur de `DATABASE_URL` depuis l'onglet **"Variables"** de votre service PostgreSQL et la coller dans les variables de votre service web.

### Étape 4 : Configurer les variables d'environnement

Dans votre service web, allez dans **Variables** et ajoutez :

```env
NEXT_PUBLIC_APP_URL=https://votre-app.railway.app
ADMIN_PASSWORD=admin123
NODE_ENV=production
```

**Important :** 
- `DATABASE_URL` est automatiquement fourni par Railway (ne pas l'ajouter manuellement)
- Remplacez `votre-app.railway.app` par le domaine généré par Railway (trouvable dans **Settings** > **Networking**)

### Étape 5 : Déployer

Railway détectera automatiquement le `Dockerfile` et commencera le déploiement. Le processus inclut :

- ✅ Construction de l'image Docker
- ✅ Exécution automatique des migrations au démarrage
- ✅ Exécution du seed pour initialiser les données
- ✅ Démarrage de l'application Next.js

### Étape 6 : Obtenir votre URL

1. Allez dans **Settings** > **Networking** de votre service web
2. Cliquez sur **"Generate Domain"** pour obtenir un domaine public
3. Utilisez cette URL pour mettre à jour `NEXT_PUBLIC_APP_URL` si nécessaire

## 📋 Fichiers de Configuration

Le projet inclut les fichiers suivants pour Railway :

- **`railway.json`** : Configuration Railway (builder Docker, script de démarrage)
- **`Dockerfile`** : Image Docker optimisée pour la production
- **`scripts/railway-entrypoint.sh`** : Script qui exécute les migrations au démarrage

## 🔧 Variables d'Environnement

### Automatiquement fournies par Railway

- `DATABASE_URL` : Connexion PostgreSQL (depuis le service PostgreSQL)
- `PORT` : Port d'écoute (géré automatiquement)
- `RAILWAY_PUBLIC_DOMAIN` : Domaine public de l'application

### À configurer manuellement

- `NEXT_PUBLIC_APP_URL` : URL publique de l'application (ex: `https://votre-app.railway.app`)
- `ADMIN_PASSWORD` : Mot de passe pour l'utilisateur admin créé par le seed
- `NODE_ENV` : `production`

## 🐛 Dépannage

### Erreur "DATABASE_URL n'est pas défini"

Cette erreur signifie que Railway n'a pas injecté automatiquement la variable `DATABASE_URL` dans votre service web.

**Solution :**

1. **Vérifiez que PostgreSQL est dans le même projet** :
   - Ouvrez votre projet Railway
   - Vérifiez que vous voyez à la fois le service web ET le service PostgreSQL dans la liste des services

2. **Ajoutez manuellement DATABASE_URL** :
   - Cliquez sur votre service web
   - Allez dans l'onglet **"Variables"**
   - Cliquez sur **"New Variable"**
   - **Variable** : `DATABASE_URL`
   - **Value** : Cliquez sur **"Reference"** et sélectionnez votre service PostgreSQL
   - Railway générera automatiquement : `${{NomDuService.DATABASE_URL}}`
   - Cliquez sur **"Add"**

3. **Redéployez** :
   - Après avoir ajouté la variable, Railway redéploiera automatiquement
   - Ou cliquez manuellement sur **"Redeploy"** dans l'onglet **"Deployments"**

### L'application ne démarre pas

1. Vérifiez les logs dans **Deployments** > **View Logs**
2. Assurez-vous que le service PostgreSQL est dans le même projet Railway
3. Vérifiez que `DATABASE_URL` est bien défini (visible dans les variables d'environnement du service web)

### Les migrations échouent

Les migrations sont exécutées automatiquement au démarrage. Si elles échouent :

1. Consultez les logs pour voir l'erreur exacte
2. Vous pouvez exécuter manuellement les migrations via Railway CLI :
   ```bash
   railway run npm run migrate
   ```

### L'application redémarre en boucle

1. Vérifiez les logs pour identifier l'erreur
2. Assurez-vous que le port est correctement configuré (Railway le gère automatiquement)
3. Vérifiez que la base de données est accessible

## 🔄 Mise à jour

Pour mettre à jour l'application :

1. Poussez vos changements sur GitHub
2. Railway détectera automatiquement les changements
3. Un nouveau déploiement sera lancé automatiquement
4. Les migrations seront réexécutées au démarrage

## 📊 Accès à la Base de Données

Pour accéder à votre base de données PostgreSQL :

1. Allez dans votre service PostgreSQL
2. Cliquez sur l'onglet **Data**
3. Utilisez l'éditeur de requêtes intégré

## 🔐 Sécurité

- Changez le mot de passe admin par défaut (`ADMIN_PASSWORD`) en production
- Railway fournit automatiquement HTTPS pour votre domaine public
- Les variables d'environnement sont sécurisées et chiffrées

## 📚 Ressources

- Documentation Railway : https://docs.railway.app
- Support Railway : https://railway.app/help

