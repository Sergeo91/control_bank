# Déployer ce projet sur Vercel (gratuit) — guide détaillé

Ce projet est une application **Next.js 14 (App Router)** qui utilise **PostgreSQL** via le package `pg`.

Sur Vercel, l’application tourne en **serverless** (fonctions). La partie “hébergement” est gratuite, mais la base de données doit être fournie par un service externe (Neon, Supabase, etc.).

---

## 1) Prérequis

- Un compte GitHub (ou GitLab/Bitbucket)
- Un compte Vercel
- Un compte **Neon** ou **Supabase**

---

## 2) Recommandation DB (Neon vs Supabase) — le meilleur choix “gratuit”

### Choix recommandé par défaut : **Neon (Postgres pur)**

**Pourquoi c’est souvent le meilleur match pour Vercel :**
- **PostgreSQL “pur”** : simple, standard, compatible avec `pg` sans refactor.
- **Très bon fit serverless** : Neon est conçu pour des workloads à connexions intermittentes.
- **Très simple** : tu ne payes pas pour des fonctionnalités que tu n’utilises pas (Auth/Storage).

**Quand choisir Neon :**
- Tu veux juste Postgres + Vercel.
- Tu gères déjà l’auth et tu n’as pas besoin de Storage.

**Conseil important (serverless)** :
- Si Neon te propose **une URL “pooled”** et **une URL “direct”**, utilise **la pooled** pour Vercel (moins de risques de “too many connections”).

### Alternative “plateforme” : **Supabase (Postgres + Auth + Storage + API)**

**Pourquoi c’est intéressant :**
- **Auth** + **Storage** + **dashboard** + **Postgres** dans un seul produit.
- Si tu veux rapidement ajouter login, fichiers, rôles, etc., c’est très pratique.

**Quand choisir Supabase :**
- Tu veux Auth/Storage “prêt à l’emploi”.
- Tu prévois d’utiliser les features Supabase (RLS, buckets, etc.).

**Conseil important (serverless)** :
- Sur Supabase, privilégie l’URL du **pooler (PgBouncer)** si disponible dans ton projet (souvent appelée “Connection pooling”). C’est plus robuste quand ton trafic monte ou quand Vercel scale sur plusieurs instances.

### Résumé décisionnel

- **Le plus simple / le plus “clean” pour ce projet tel qu’il est**: **Neon**
- **Le plus complet si tu veux des features produit**: **Supabase**

---

## 3) Créer la base PostgreSQL

### Option A — Neon (recommandé)

1. Crée un projet Neon
2. Crée une base / branche (par défaut c’est ok)
3. Récupère la chaîne de connexion Postgres (**DATABASE_URL**)
4. Assure-toi d’avoir une URL de la forme :
   - `postgresql://...` et idéalement avec SSL requis (Neon le fait généralement)

### Option B — Supabase

1. Crée un projet Supabase
2. Va dans les réglages DB et récupère une URL Postgres
3. Supabase exige SSL en production

---

## 4) Préparer les variables d’environnement (local + Vercel)

### En local

1. Duplique `.env.example` en `.env.local`
2. Renseigne :
   - `DATABASE_URL`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - `ADMIN_PASSWORD`

### Sur Vercel

Dans **Project → Settings → Environment Variables**, ajoute :

- `DATABASE_URL` : chaîne Postgres Neon/Supabase
- `DATABASE_SSL` : `true` (recommandé)
- `NEXT_PUBLIC_APP_URL` : URL publique Vercel (ex: `https://ton-projet.vercel.app`)
- `ADMIN_PASSWORD` : un mot de passe fort (si tu utilises `seed` / `create-admin`)
- `NODE_ENV` : (optionnel) Vercel met `production` en prod

> Note: dans le code, SSL est activé si `DATABASE_SSL=true` **ou** `PGSSLMODE=require` **ou** `?sslmode=require` est présent dans `DATABASE_URL`.

**Recommandation Vercel** :
- Configure les variables pour **Production** et **Preview** (au minimum `DATABASE_URL` + `DATABASE_SSL`), sinon tes déploiements de PR/preview peuvent casser.

---

## 5) Importer le repo sur Vercel (déploiement gratuit)

1. Pousse le code sur GitHub
2. Sur Vercel : “Add New → Project”
3. Sélectionne le repo
4. Vercel détecte automatiquement Next.js
5. Vérifie les réglages :
   - **Build Command** : `npm run build`
   - **Output** : Next.js (auto)
6. Ajoute les variables d’environnement (section 4)
7. Lance “Deploy”

---

## 6) Migrations & seed (important sur Vercel)

### Pourquoi c’est différent de Render/Railway/Docker

Sur Vercel, tu n’as pas un conteneur “long running” où exécuter automatiquement un entrypoint.
Donc **les migrations/seed ne doivent pas dépendre du démarrage du serveur**.

Ici, la stratégie recommandée est :
- **Migrations** : exécutées depuis ta machine (ou CI), *avant* / *pendant* un déploiement
- **Seed** : exécuté une seule fois, sur la base cible

### Exécuter les migrations sur la base distante (Neon/Supabase)

Dans un terminal local :

```bash
# Windows PowerShell (exemple)
$env:DATABASE_URL="postgresql://..."
npm install
npm run migrate
```

### Seed initial (rubriques, barème, admin)

```bash
$env:DATABASE_URL="postgresql://..."
$env:ADMIN_PASSWORD="un-mot-de-passe-fort"
npm run seed
```

### Créer / recréer un admin (si besoin)

```bash
$env:DATABASE_URL="postgresql://..."
$env:ADMIN_PASSWORD="un-mot-de-passe-fort"
npm run create-admin
```

---

## 7) Bonnes pratiques “serverless Postgres” (pour éviter les soucis)

### Pooling

En serverless, ouvrir trop de connexions est le problème n°1.
Le projet limite maintenant le pool à **3 connexions max** en production (voir `lib/db.ts`).

Si tu as encore des erreurs “too many connections” :
- Mets `DATABASE_URL` sur **l’endpoint pooled/pooler** (Neon/Supabase)
- Réduis `max` à **1–2** dans `lib/db.ts`

### SSL

Neon/Supabase demandent généralement SSL : laisse `DATABASE_SSL=true` sur Vercel.

### Timeout

Si tu vois des erreurs “timeout / too many connections” :
- baisse encore `max` (ex: 1–2)
- vérifie le plan DB
- vérifie que les requêtes se ferment bien (le pool gère, mais évite les connexions “par requête”)

---

## 8) Limites du gratuit : ce qui peut bloquer

- **Vercel Free** : très bon pour Next.js, mais tu dois accepter le modèle serverless (pas de “cron” permanent sans add-on).
- **Base gratuite** : capacité/quotas (stockage, compute, connexions). Si tu as beaucoup d’agents et beaucoup de trafic, c’est la DB qui limitera avant Vercel.

---

## 9) Checklist “ça marche”

- [ ] Le projet build sur Vercel
- [ ] Les variables d’env sont définies (prod + preview si besoin)
- [ ] `npm run migrate` a été exécuté sur la base distante
- [ ] `npm run seed` a été exécuté une fois (si nécessaire)
- [ ] L’URL est mise dans `NEXT_PUBLIC_APP_URL`

