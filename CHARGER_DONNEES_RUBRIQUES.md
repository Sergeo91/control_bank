# Guide : Charger les données des rubriques sur Render (Plan Free)

Sur le plan gratuit de Render, vous n'avez pas accès au Shell pour exécuter des commandes. Voici comment charger les données des rubriques depuis `synthese.xlsx` sans Shell.

## 🎯 Solution : Bouton dans l'interface Admin

J'ai ajouté un bouton dans la page d'administration qui permet de charger les données automatiquement.

### Étapes pour charger les données

1. **Accéder à la page Admin**
   - Allez sur votre application : `https://mission-suivi-banque.onrender.com`
   - Cliquez sur `/admin` ou accédez directement à : `https://mission-suivi-banque.onrender.com/admin`

2. **Onglet "Synthèse"**
   - L'onglet "Synthèse" est sélectionné par défaut
   - Vous verrez une alerte bleue avec des informations sur les données des rubriques

3. **Cliquer sur "Charger les données des rubriques"**
   - Le bouton se trouve à côté du bouton "Exporter"
   - Cliquez sur **"Charger les données des rubriques"**
   - Attendez quelques secondes (le bouton affichera "Chargement...")

4. **Confirmation**
   - Un message de succès s'affichera : `✅ X rubriques mises à jour avec succès`
   - Si les données sont déjà chargées, vous verrez : `Les données des rubriques sont déjà chargées`

5. **Vérifier l'export**
   - Testez l'export Excel pour vérifier que les colonnes "Critères / Indicateurs" et "Mode de vérification" contiennent maintenant les données

## 🔄 Chargement automatique au démarrage

Le script de démarrage (`deploy-entrypoint.sh`) essaie automatiquement de charger les données depuis `synthese.xlsx` au démarrage de l'application. Si le fichier est présent et que les données ne sont pas déjà chargées, elles seront chargées automatiquement.

## 📋 Prérequis

- Le fichier `synthese.xlsx` doit être présent dans votre dépôt GitHub (à la racine du projet)
- Le fichier doit contenir les feuilles : `FI`, `F_QS`, et `F_GAB`
- Chaque feuille doit avoir les colonnes : "Composante évaluée", "Critères / Indicateurs", et "Mode de vérification"

## 🐛 Dépannage

### Le bouton ne fonctionne pas

1. Vérifiez les logs de Render pour voir l'erreur exacte
2. Assurez-vous que le fichier `synthese.xlsx` est bien dans votre dépôt GitHub
3. Vérifiez que le fichier est bien commité et poussé

### Les données ne se chargent pas

1. Vérifiez que le fichier `synthese.xlsx` est présent dans votre dépôt
2. Vérifiez que les colonnes sont bien nommées dans le fichier Excel
3. Consultez les logs de Render pour voir les erreurs détaillées

### Le fichier synthese.xlsx n'est pas trouvé

Si vous voyez l'erreur "Fichier synthese.xlsx non trouvé" :
1. Assurez-vous que le fichier est à la racine du projet
2. Vérifiez qu'il est bien commité dans Git
3. Poussez-le sur GitHub
4. Redéployez sur Render

## 📝 Note importante

- Le script vérifie automatiquement si les données sont déjà chargées avant de les charger à nouveau
- Vous pouvez cliquer sur le bouton plusieurs fois sans problème
- Les données seront mises à jour seulement si elles sont vides ou manquantes

