# Dépannage Render - Erreur 502 Bad Gateway

## 🔍 Causes possibles

1. **DATABASE_URL non configuré** - L'application ne démarre pas
2. **Port incorrect** - L'application n'écoute pas sur le bon port
3. **Application qui crash** - Erreur au démarrage
4. **Service en "sleep"** - Plan gratuit qui s'est endormi

## ✅ Solutions

### 1. Vérifier les logs Render

1. Allez dans votre service web `mission-suivi-banque`
2. Cliquez sur l'onglet **"Logs"**
3. Vérifiez les dernières lignes pour voir l'erreur exacte

### 2. Vérifier DATABASE_URL

**Si vous voyez dans les logs : "❌ ERREUR: DATABASE_URL n'est pas défini"**

1. Allez dans votre service web > **Environment**
2. Vérifiez que `DATABASE_URL` existe
3. Si elle n'existe pas :
   - Cliquez sur **"Add"**
   - Key : `DATABASE_URL`
   - Value : Copiez l'**Internal Database URL** depuis votre base de données PostgreSQL
   - Cliquez sur **"Save Changes"**

### 3. Vérifier le port

Render utilise la variable `PORT` automatiquement. Next.js standalone devrait la détecter automatiquement.

Si le problème persiste, vérifiez dans les logs que l'application écoute bien sur le port fourni par Render.

### 4. Vérifier toutes les variables d'environnement

Assurez-vous d'avoir ces 4 variables :

- ✅ `DATABASE_URL` (depuis la base PostgreSQL)
- ✅ `NODE_ENV` = `production`
- ✅ `NEXT_PUBLIC_APP_URL` = `https://mission-suivi-banque.onrender.com`
- ✅ `ADMIN_PASSWORD` = `admin123`

### 5. Redéployer après les modifications

Après avoir ajouté/modifié les variables :
- Render redéploiera automatiquement
- Ou cliquez sur **"Manual Deploy"** > **"Deploy latest commit"**

### 6. Vérifier que le service n'est pas en "sleep"

Sur le plan gratuit, les services "dorment" après 15 minutes d'inactivité.

**Solution :**
- Attendez quelques secondes après avoir accédé à l'URL
- Ou utilisez un service de monitoring comme UptimeRobot pour ping votre URL toutes les 5 minutes

## 📋 Checklist de dépannage

- [ ] DATABASE_URL est configuré dans Environment Variables
- [ ] Toutes les variables d'environnement sont présentes
- [ ] Les logs ne montrent pas d'erreur de démarrage
- [ ] Le service n'est pas en "sleep" (attendre quelques secondes)
- [ ] Le déploiement s'est terminé avec succès

## 🔗 Ressources

- Documentation Render : https://render.com/docs/troubleshooting-deploys
- Support Render : https://render.com/docs/support

