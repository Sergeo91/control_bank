# Mission Suivi Banque - Plateforme d'Évaluation

Application web complète pour l'évaluation des banques par des agents de terrain.

## Stack Technique

- **Framework**: Next.js 14 (App Router)
- **Langage**: TypeScript
- **Base de données**: PostgreSQL
- **Styling**: Tailwind CSS + DaisyUI
- **Authentification**: Sessions avec tokens
- **Export**: Excel (xlsx)

## Déploiement sur Vercel (gratuit)

Ce projet est compatible Vercel (hébergement Next.js gratuit). La base PostgreSQL doit être fournie via un service externe (ex: **Neon** ou **Supabase**).

- Guide complet: [`DEPLOY_VERCEL.md`](./DEPLOY_VERCEL.md)

## Installation

### Prérequis

- **Node.js** : Version 18 ou supérieure
- **npm** ou **yarn** : Gestionnaire de paquets Node.js
- **Docker** et **Docker Compose** (optionnel, pour le mode Docker)
- **PostgreSQL** : Version 14 ou supérieure (si installation locale)

---

## Modes de Lancement

### 🐳 Mode 1 : Développement avec Docker (Recommandé)

**Avantages :** Configuration automatique, pas besoin d'installer PostgreSQL localement, environnement isolé.

#### Installation initiale

1. Installer Docker et Docker Compose :
   - **macOS/Windows** : https://www.docker.com/products/docker-desktop
   - **Linux** : `sudo apt-get install docker.io docker-compose`

2. Lancer l'environnement de développement :
```bash
npm run docker:dev:build
```

Cette commande va :
- ✅ Créer et démarrer un conteneur PostgreSQL
- ✅ Créer et démarrer l'application Next.js
- ✅ Exécuter automatiquement les migrations et le seed au premier démarrage
- ✅ L'application sera accessible sur **http://localhost:3000** (local) et **http://VOTRE_IP:3000** (réseau local)

#### Commandes Docker disponibles

```bash
# Démarrer en mode développement (sans reconstruire)
npm run docker:dev

# Reconstruire et démarrer (après modifications du Dockerfile)
npm run docker:dev:build

# Arrêter les conteneurs
docker-compose -f docker-compose.dev.yml down

# Arrêter et supprimer les volumes (nettoyage complet)
docker-compose -f docker-compose.dev.yml down -v

# Voir les logs en temps réel
docker-compose -f docker-compose.dev.yml logs -f

# Voir les logs du conteneur web uniquement
docker-compose -f docker-compose.dev.yml logs web

# Voir les logs de la base de données
docker-compose -f docker-compose.dev.yml logs db

# Exécuter les migrations manuellement
docker-compose -f docker-compose.dev.yml exec web npm run migrate

# Exécuter le seed manuellement
docker-compose -f docker-compose.dev.yml exec web npm run seed

# Mettre à jour les rubriques depuis Excel
docker-compose -f docker-compose.dev.yml exec web npm run update-rubriques

# Accéder au shell du conteneur web
docker-compose -f docker-compose.dev.yml exec web sh

# Accéder à PostgreSQL directement
docker-compose -f docker-compose.dev.yml exec db psql -U mission_banque_user -d mission_banque_db
```

---

### 💻 Mode 2 : Développement local (sans Docker)

**Avantages :** Plus de contrôle, pas besoin de Docker, développement plus rapide.

#### Installation

1. **Installer les dépendances :**
```bash
npm install
```

2. **Installer et configurer PostgreSQL :**

   **Sur macOS (avec Homebrew) :**
   ```bash
   # Installer PostgreSQL
   brew install postgresql@14
   
   # Démarrer PostgreSQL
   brew services start postgresql@14
   
   # Créer la base de données
   createdb mission_suivi_banque
   ```

   **Sur Linux (Ubuntu/Debian) :**
   ```bash
   # Installer PostgreSQL
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib
   
   # Démarrer PostgreSQL
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # Créer la base de données (en tant qu'utilisateur postgres)
   sudo -u postgres createdb mission_suivi_banque
   ```

   **Sur Windows :**
   - Télécharger et installer PostgreSQL depuis https://www.postgresql.org/download/windows/
   - Créer la base de données via pgAdmin ou en ligne de commande :
   ```bash
   createdb -U postgres mission_suivi_banque
   ```

3. **Configurer les variables d'environnement :**

   Créer un fichier `.env` à la racine du projet avec :
   ```env
   DATABASE_URL=postgresql://votre_utilisateur:votre_mot_de_passe@localhost:5432/mission_suivi_banque
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ADMIN_PASSWORD=admin123
   NODE_ENV=development
   ```
   
   **Note :** Remplacez `votre_utilisateur` et `votre_mot_de_passe` par vos identifiants PostgreSQL.
   - Par défaut sur macOS/Linux : `postgres` (sans mot de passe ou votre mot de passe)
   - Exemple : `DATABASE_URL=postgresql://postgres:monmotdepasse@localhost:5432/mission_suivi_banque`

4. **Initialiser la base de données :**
```bash
# Exécuter les migrations
npm run migrate

# Initialiser les données (rubriques, barème, utilisateur admin)
npm run seed

# Mettre à jour les rubriques depuis le fichier synthese.xlsx
npm run update-rubriques
```

   **Note :** L'étape `update-rubriques` remplit les colonnes `composante_evaluee`, `criteres_indicateurs` et `mode_verification` des rubriques avec les données du fichier Excel.

5. **Lancer le serveur de développement :**
```bash
npm run dev
```

L'application sera accessible sur :
- **Local** : http://localhost:3000
- **Réseau local** : http://VOTRE_IP:3000 (voir section "Accès depuis le réseau local" ci-dessous)

---

### 🚀 Mode 3 : Production avec Docker

**Pour déployer en production :**

```bash
npm run docker:prod:build
```

Cette commande va :
- ✅ Créer une image optimisée avec Next.js standalone
- ✅ Utiliser le fichier `docker-compose.yml` (production)
- ✅ Démarrer les conteneurs en mode production

**Commandes production :**
```bash
# Démarrer en production
npm run docker:prod

# Reconstruire et démarrer en production
npm run docker:prod:build

# Arrêter les conteneurs de production
docker-compose down
```

---

### 🚂 Mode 4 : Déploiement sur Railway

**Railway** est une plateforme de déploiement cloud qui simplifie le déploiement d'applications avec base de données.

> 💡 **Limite Railway atteinte ?** Consultez [`DEPLOIEMENT_ALTERNATIVES.md`](./DEPLOIEMENT_ALTERNATIVES.md) pour des alternatives gratuites (Render, Fly.io, Vercel+Supabase, etc.)

#### Prérequis

- Un compte Railway (gratuit) : https://railway.app
- Un compte GitHub (pour connecter le dépôt)

#### Étapes de déploiement

1. **Préparer le dépôt GitHub**

   Assurez-vous que votre code est poussé sur GitHub :
   ```bash
   git add .
   git commit -m "Préparation pour Railway"
   git push origin main
   ```

2. **Créer un nouveau projet sur Railway**

   - Allez sur https://railway.app
   - Cliquez sur **"New Project"**
   - Sélectionnez **"Deploy from GitHub repo"**
   - Choisissez votre dépôt `mission_suivi_banque`

3. **Ajouter un service PostgreSQL**

   - Dans votre projet Railway, cliquez sur **"+ New"**
   - Sélectionnez **"Database"** > **"Add PostgreSQL"**
   - Railway créera automatiquement une base de données PostgreSQL
   - La variable `DATABASE_URL` sera automatiquement injectée dans votre application

4. **Configurer les variables d'environnement**

   Dans les **Variables** de votre service web, ajoutez :

   ```env
   # Railway fournira automatiquement DATABASE_URL depuis le service PostgreSQL
   # Assurez-vous que les deux services sont dans le même projet Railway
   
   # URL de l'application (remplacez par votre domaine Railway)
   NEXT_PUBLIC_APP_URL=https://votre-app.railway.app
   
   # Mot de passe administrateur (pour le seed initial)
   ADMIN_PASSWORD=admin123
   
   # Environnement
   NODE_ENV=production
   ```

   **Note :** Railway génère automatiquement un domaine public. Vous pouvez le trouver dans l'onglet **Settings** > **Networking** de votre service web. Utilisez ce domaine pour `NEXT_PUBLIC_APP_URL`.

5. **Déployer**

   Railway détectera automatiquement le `Dockerfile` et commencera le déploiement. Le processus va :
   - ✅ Construire l'image Docker
   - ✅ Exécuter automatiquement les migrations au démarrage
   - ✅ Exécuter le seed pour initialiser les données
   - ✅ Démarrer l'application Next.js

6. **Vérifier le déploiement**

   - Une fois le déploiement terminé, Railway affichera l'URL de votre application
   - Cliquez sur **"Generate Domain"** dans l'onglet **Networking** pour obtenir un domaine public
   - Accédez à votre application via ce domaine

#### Configuration Railway

Le projet inclut un fichier `railway.json` qui configure :
- Le builder Docker (utilise le `Dockerfile`)
- Le script de démarrage qui exécute automatiquement les migrations
- La politique de redémarrage en cas d'échec

#### Variables d'environnement Railway

Railway fournit automatiquement :
- `DATABASE_URL` : URL de connexion PostgreSQL (depuis le service PostgreSQL)
- `PORT` : Port sur lequel l'application doit écouter (géré automatiquement)
- `RAILWAY_PUBLIC_DOMAIN` : Domaine public de votre application

#### Commandes utiles Railway

- **Voir les logs** : Onglet **Deployments** > Cliquez sur un déploiement > **View Logs**
- **Redéployer** : Onglet **Deployments** > Cliquez sur **"Redeploy"**
- **Accéder à la base de données** : Service PostgreSQL > Onglet **Data** > **Query**

#### Dépannage Railway

**Erreur "DATABASE_URL n'est pas défini" :**
- Railway devrait injecter automatiquement `DATABASE_URL` quand PostgreSQL est dans le même projet
- Si ce n'est pas le cas, ajoutez manuellement dans votre service web > **Variables** :
  - **Variable** : `DATABASE_URL`
  - **Value** : Utilisez **"Reference"** pour référencer votre service PostgreSQL (`${{NomDuService.DATABASE_URL}}`)
- Redéployez après avoir ajouté la variable

**L'application ne démarre pas :**
- Vérifiez les logs dans l'onglet **Deployments**
- Assurez-vous que `DATABASE_URL` est bien défini (vérifiez que le service PostgreSQL est dans le même projet)
- Vérifiez que toutes les variables d'environnement sont correctement configurées

**Les migrations échouent :**
- Les migrations sont exécutées automatiquement au démarrage
- Si elles échouent, vérifiez les logs pour voir l'erreur exacte
- Vous pouvez exécuter manuellement les migrations via Railway CLI :
  ```bash
  railway run npm run migrate
  ```

**L'application redémarre en boucle :**
- Vérifiez les logs pour identifier l'erreur
- Assurez-vous que le port est correctement configuré (Railway le gère automatiquement)
- Vérifiez que la base de données est accessible

#### Mise à jour de l'application

Pour mettre à jour l'application après des modifications :
1. Poussez vos changements sur GitHub
2. Railway détectera automatiquement les changements et redéploiera
3. Les migrations seront réexécutées automatiquement au démarrage

---

## Commandes NPM Disponibles

### Développement
```bash
npm run dev              # Lancer le serveur de développement (mode local)
npm run build            # Construire l'application pour la production
npm run start            # Lancer le serveur de production (après build)
npm run lint             # Vérifier le code avec ESLint
```

### Base de données
```bash
npm run migrate          # Exécuter les migrations SQL
npm run seed             # Initialiser les données (rubriques, barème, admin)
npm run update-rubriques # Mettre à jour les rubriques depuis synthese.xlsx
```

### Docker - Développement
```bash
npm run docker:dev           # Démarrer les conteneurs de développement
npm run docker:dev:build    # Reconstruire et démarrer les conteneurs
```

### Docker - Production
```bash
npm run docker:prod          # Démarrer les conteneurs de production
npm run docker:prod:build   # Reconstruire et démarrer les conteneurs de production
```

## Dépannage

### Erreur "ECONNREFUSED" (installation locale)

Si vous obtenez une erreur de connexion à la base de données :

1. **Vérifiez que PostgreSQL est démarré :**
   - **macOS** : `brew services list` (doit afficher "started")
   - **Linux** : `sudo systemctl status postgresql`
   - **Windows** : Vérifier dans les services Windows

2. **Vérifiez que la base de données existe :**
   ```bash
   psql -l | grep mission_suivi_banque
   ```
   Si elle n'existe pas, créez-la :
   ```bash
   createdb mission_suivi_banque
   ```

3. **Vérifiez votre fichier `.env` et la variable `DATABASE_URL`**
   - Format attendu : `postgresql://utilisateur:motdepasse@localhost:5432/mission_suivi_banque`
   - Vérifiez que les identifiants sont corrects

### Problèmes avec Docker

**Les conteneurs ne démarrent pas :**
```bash
# Arrêter tous les conteneurs
docker-compose -f docker-compose.dev.yml down

# Relancer
npm run docker:dev:build
```

**Nettoyage complet (supprime aussi les volumes et données) :**
```bash
docker-compose -f docker-compose.dev.yml down -v
```

**Vérifier les logs pour diagnostiquer :**
```bash
# Logs de tous les conteneurs
docker-compose -f docker-compose.dev.yml logs -f

# Logs du conteneur web uniquement
docker-compose -f docker-compose.dev.yml logs web

# Logs de la base de données
docker-compose -f docker-compose.dev.yml logs db
```

**Erreur "port already in use" :**
- Le port 3000 ou 5432 est déjà utilisé
- Arrêtez l'application qui utilise le port ou modifiez les ports dans `docker-compose.dev.yml`

**Erreur de permissions Docker :**
- Sur Linux, ajoutez votre utilisateur au groupe docker : `sudo usermod -aG docker $USER`
- Redémarrez votre session

### Problèmes de migrations

**Les migrations échouent :**
```bash
# En Docker
docker-compose -f docker-compose.dev.yml exec web npm run migrate

# En local
npm run migrate
```

**Réinitialiser complètement la base de données :**
```bash
# ⚠️ ATTENTION : Cela supprime toutes les données !
# En Docker
docker-compose -f docker-compose.dev.yml down -v
npm run docker:dev:build

# En local
dropdb mission_suivi_banque
createdb mission_suivi_banque
npm run migrate
npm run seed
npm run update-rubriques
```

## Structure du Projet

- `/app` : Pages et routes API Next.js
- `/lib` : Utilitaires (DB, auth, validation, maintenance)
- `/migrations` : Scripts SQL de migration
- `/scripts` : Scripts de migration et seed

## Fonctionnalités

### Authentification
- Connexion avec email/mot de passe
- Sessions sécurisées avec tokens
- Rôles : admin, superviseur, agent

### Interface Agents
- Saisie des évaluations avec 3 volets :
  - Fonctionnement Interne (FI)
  - Qualité de Service (F_QS)
  - GAB (F_GAB)
- 12 rubriques par volet
- Notes de 1 à 5 avec commentaires

### Dashboard Admin/Superviseur
- Filtres par mission, ville, établissement, contrôleur, volet
- Statistiques et moyennes
- Export Excel des moyennes (un classeur par volet)

### Administration
- Mode maintenance (ON/OFF)
- Gestion des utilisateurs
- Gestion des référentiels (villes, établissements, missions, contrôleurs)

## Utilisateur par défaut

- Email : `sergeobusiness1@gmail.com`
- Mot de passe : `Pass_w0rd`
- Rôle : `admin`

## Accès à l'Application

### Accès local (sur la même machine)

- **Page principale** : http://localhost:3000
- **Page d'administration** : http://localhost:3000/admin

### Accès depuis le réseau local

L'application est configurée pour être accessible depuis d'autres machines sur le même réseau local.

#### 1. Trouver votre adresse IP locale

**Sur Windows :**
```bash
ipconfig
```
Cherchez la ligne "Adresse IPv4" sous votre connexion réseau active (généralement commence par `192.168.x.x` ou `10.x.x.x`)

**Sur macOS/Linux :**
```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Linux
ip addr show | grep "inet " | grep -v 127.0.0.1

# Ou plus simplement
hostname -I
```

#### 2. Accéder depuis une autre machine

Une fois que vous avez votre adresse IP locale (par exemple `192.168.1.100`), vous pouvez accéder à l'application depuis n'importe quelle machine sur le même réseau :

- **Page principale** : http://192.168.1.100:3000
- **Page d'administration** : http://192.168.1.100:3000/admin

**Remplacez `192.168.1.100` par votre propre adresse IP.**

#### 3. Configuration du pare-feu

Si vous ne pouvez pas accéder depuis une autre machine, vérifiez que le pare-feu autorise les connexions sur le port 3000 :

**Windows :**
```bash
# Ouvrir le port 3000 dans le pare-feu Windows
netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=3000
```

**macOS :**
- Allez dans **Préférences Système** > **Sécurité et confidentialité** > **Pare-feu**
- Cliquez sur **Options du pare-feu** et ajoutez une exception pour le port 3000

**Linux (UFW) :**
```bash
sudo ufw allow 3000/tcp
```

#### 4. Configuration Docker (optionnel)

Si vous utilisez Docker et souhaitez que `NEXT_PUBLIC_APP_URL` utilise votre IP réseau au lieu de localhost, modifiez `docker-compose.dev.yml` :

```yaml
environment:
  NEXT_PUBLIC_APP_URL: http://192.168.1.100:3000  # Remplacez par votre IP
```

Puis redémarrez les conteneurs :
```bash
docker-compose -f docker-compose.dev.yml down
npm run docker:dev:build
```

### Fonctionnalités

**Page principale** (`/`) :
- Saisie des évaluations par les agents
- Formulaire guidé : Ville → Établissement → Période → Contrôleur → Volet
- Évaluation des 12 rubriques par volet avec notes (1-5) et observations

**Page d'administration** (`/admin`) :
- **Accès** : Direct (authentification désactivée)
- **Synthèse** : Filtres et export Excel des évaluations
- **Maintenance** : Activer/désactiver le mode maintenance
- **Utilisateurs** : Gestion des utilisateurs (à venir)
- **Référentiels** : Gestion des villes, établissements, missions, contrôleurs (à venir)

## Notes Importantes

- ⚠️ **Authentification désactivée** : La page `/admin` est accessible sans authentification
- 🔒 **Sécurité réseau** : L'accès depuis le réseau local expose l'application à toutes les machines sur le même réseau. En production, utilisez un reverse proxy (nginx, traefik) avec HTTPS et authentification.
- 🔧 **Mode maintenance** : Permet de bloquer l'accès à l'application (sauf admin)
- 📊 **Rubriques** : Les rubriques sont pré-définies pour chaque volet (FI, F_QS, F_GAB)
- 📁 **Export Excel** : Génère un classeur avec une feuille par combinaison (Ville, Établissement) pour chaque volet
- 📝 **Fichier synthese.xlsx** : Doit être présent à la racine du projet pour mettre à jour les rubriques
- 🌐 **Accès réseau** : L'application écoute sur `0.0.0.0` par défaut, ce qui permet l'accès depuis le réseau local. Assurez-vous que votre pare-feu est correctement configuré.


**Pour remplacer complètement votre version locale par celle de GitHub :**

⚠️ **ATTENTION :** Cette opération va **écraser toutes vos modifications locales** non sauvegardées sur GitHub. Assurez-vous d'avoir sauvegardé ou commité vos changements importants avant de continuer.

**Méthode 1 : Reset complet (Recommandée si vous voulez vraiment tout écraser)**
```bash
# 1. Récupérer toutes les informations du dépôt distant
git fetch origin

# 2. Réinitialiser votre branche locale pour qu'elle corresponde exactement à la branche distante
git reset --hard origin/main

# 3. Nettoyer tous les fichiers non suivis (optionnel, mais recommandé)
git clean -fd
```

**Explication :**
- `git fetch origin` : Télécharge les dernières informations du dépôt distant sans modifier vos fichiers locaux
- `git reset --hard origin/main` : Réinitialise votre branche locale `main` pour qu'elle corresponde exactement à `origin/main`. **Toutes vos modifications locales non commitées seront perdues**
- `git clean -fd` : Supprime tous les fichiers et dossiers non suivis par Git (fichiers créés localement mais jamais ajoutés à Git)

**Méthode 2 : Checkout direct (Alternative simple)**
```bash
# 1. Récupérer les dernières informations
git fetch origin

# 2. Forcer le checkout de la branche distante
git checkout -f origin/main

# 3. Déplacer votre branche locale sur cette version
git branch -f main origin/main

# 4. Revenir sur votre branche locale
git checkout main
```

**Explication :**
- `git fetch origin` : Télécharge les informations du dépôt distant
- `git checkout -f origin/main` : Force le checkout de la version distante (ignore les modifications locales)
- `git branch -f main origin/main` : Force votre branche locale `main` à pointer vers `origin/main`
- `git checkout main` : Revenir sur votre branche locale (maintenant identique à la distante)

**Méthode 3 : Supprimer et cloner à nouveau (Solution radicale)**