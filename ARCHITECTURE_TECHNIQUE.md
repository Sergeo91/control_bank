# Architecture Technique — Mission Suivi Banque

## Vue d'ensemble technique du projet

### Nature de la solution

Cette application est une **plateforme web full-stack** de type SaaS métier, conçue pour digitaliser et standardiser le processus d'évaluation des établissements bancaires. Il s'agit d'une application transactionnelle orientée données, avec des exigences fortes en matière d'intégrité, de traçabilité et de fiabilité opérationnelle.

### Objectif technique global

L'objectif technique principal est de fournir une architecture robuste, sécurisée et évolutive qui garantit :

- **L'intégrité des données** : Chaque évaluation doit être complète, traçable et non dupliquée
- **La performance** : Interface réactive pour les agents sur le terrain, requêtes optimisées pour les analyses
- **La disponibilité** : Système opérationnel en continu, avec capacité de maintenance sans interruption
- **La sécurité** : Protection des données sensibles, contrôle d'accès granulaire, authentification sécurisée
- **L'évolutivité** : Architecture modulaire permettant l'ajout de fonctionnalités sans refonte majeure

### Contraintes majeures identifiables

**Scalabilité** : L'application doit supporter un nombre croissant d'évaluations, de contrôleurs et d'établissements sans dégradation de performance. Les requêtes analytiques doivent rester performantes même avec un volume important de données historiques.

**Multi-utilisateurs concurrents** : Plusieurs agents peuvent saisir des évaluations simultanément. Le système doit gérer les conflits potentiels (détection de doublons, remplacement d'évaluations existantes) de manière atomique.

**Fiabilité transactionnelle** : Une évaluation comprend 12 rubriques qui doivent être enregistrées de manière atomique. En cas d'échec partiel, l'intégrité de la base de données doit être préservée.

**Traçabilité complète** : Chaque opération doit conserver son contexte (qui, quand, où, quoi) pour permettre l'audit et la reconstruction de l'historique.

**Accessibilité terrain** : L'interface doit être utilisable depuis des appareils mobiles dans des conditions de connectivité variables.

---

## Architecture globale

### Description de l'architecture

L'application suit une **architecture en couches modulaires** basée sur Next.js 14 avec le App Router, exploitant les Server Components et les API Routes pour une séparation claire entre la logique métier et la présentation.

**Couche de présentation** : Composants React côté client pour l'interface utilisateur, avec gestion d'état locale pour les formulaires complexes. Les composants sont organisés par fonctionnalité (saisie, administration, navigation).

**Couche API** : Routes API Next.js qui servent de contrôleurs, orchestrant la validation, l'authentification et l'accès aux données. Chaque route expose une interface RESTful claire et cohérente.

**Couche de logique métier** : Modules réutilisables dans `/lib` qui encapsulent les opérations critiques (authentification, validation, gestion de la base de données, soft delete, maintenance). Cette séparation permet la réutilisation et facilite les tests.

**Couche de données** : PostgreSQL avec un pool de connexions géré, migrations versionnées pour garantir la cohérence du schéma, et contraintes d'intégrité référentielle au niveau base de données.

### Interaction entre les grandes briques

Le flux typique d'une opération suit ce pattern :

1. **Requête utilisateur** → Le client envoie une requête HTTP à une route API
2. **Validation** → La route valide les données d'entrée avec Zod avant toute opération
3. **Authentification** → Vérification de la session et des permissions si nécessaire
4. **Logique métier** → Appel aux fonctions utilitaires dans `/lib` qui encapsulent la logique complexe
5. **Accès données** → Utilisation du pool de connexions pour exécuter des requêtes SQL paramétrées
6. **Transaction** → Pour les opérations multi-étapes, utilisation de transactions SQL pour garantir l'atomicité
7. **Réponse** → Retour d'une réponse JSON structurée avec gestion d'erreurs appropriée

### Logique de structuration du projet

**Séparation par responsabilité** :

- `/app` : Pages et routes API organisées par fonctionnalité (admin, auth, evaluations, etc.)
- `/lib` : Utilitaires réutilisables (db, auth, validation, maintenance, soft-delete)
- `/migrations` : Scripts SQL versionnés pour l'évolution du schéma
- `/scripts` : Scripts d'administration (migration, seed, déploiement)
- `/components` : Composants React réutilisables

**Convention de nommage** : Les routes API suivent la structure RESTful (`/api/resource/route.ts`), les migrations sont numérotées séquentiellement, et les modules utilitaires ont des noms explicites.

**Isolation des dépendances** : Les dépendances critiques (base de données, authentification) sont centralisées dans des modules dédiés, facilitant les tests et les modifications futures.

---

## Technologies & outils utilisés

### Next.js 14 (App Router)

**Rôle** : Framework full-stack qui unifie le développement frontend et backend dans une seule application.

**Pourquoi ce choix** : 
- **Productivité** : Server Components et API Routes permettent de développer rapidement sans configuration complexe
- **Performance** : Rendu côté serveur par défaut, optimisation automatique des assets, code splitting intelligent
- **Type-safety** : Intégration native avec TypeScript pour une sécurité de type de bout en bout
- **Déploiement** : Mode standalone permet un déploiement containerisé optimisé

**Bénéfices** : Réduction du temps de développement, meilleures performances perçues par l'utilisateur, architecture unifiée facilitant la maintenance.

### TypeScript (mode strict)

**Rôle** : Langage typé qui compile vers JavaScript, avec vérification de types à la compilation.

**Pourquoi ce choix** :
- **Détection précoce d'erreurs** : Les erreurs de type sont détectées avant l'exécution, réduisant drastiquement les bugs en production
- **Documentation vivante** : Les types servent de documentation et facilitent la compréhension du code
- **Refactoring sécurisé** : Les changements de structure sont détectés automatiquement dans tout le codebase
- **IntelliSense** : Autocomplétion et suggestions dans l'IDE améliorent la productivité

**Bénéfices** : Réduction des erreurs de runtime, meilleure maintenabilité, onboarding plus rapide des nouveaux développeurs.

### PostgreSQL

**Rôle** : Base de données relationnelle pour le stockage persistant des données métier.

**Pourquoi ce choix** :
- **Intégrité référentielle** : Contraintes FOREIGN KEY garantissent la cohérence des données au niveau base
- **Transactions ACID** : Support natif des transactions pour garantir l'atomicité des opérations complexes
- **Performance** : Index stratégiques optimisent les requêtes analytiques fréquentes
- **Robustesse** : Base de données éprouvée en production, avec gestion avancée des connexions et du locking

**Bénéfices** : Garantie d'intégrité des données, performance prévisible, évolutivité verticale et horizontale.

### pg (node-postgres) avec Pool

**Rôle** : Driver PostgreSQL pour Node.js avec gestion de pool de connexions.

**Pourquoi ce choix** :
- **Efficacité** : Le pool réutilise les connexions, évitant le coût d'établissement répété
- **Contrôle** : Configuration fine du nombre de connexions (max: 20), timeout d'inactivité (30s), timeout de connexion (5s)
- **Robustesse** : Gestion automatique des erreurs de connexion avec événements dédiés
- **Simplicité** : API simple et intuitive pour les requêtes paramétrées

**Bénéfices** : Performance optimale, résilience aux pannes réseau, contrôle précis des ressources.

### Zod

**Rôle** : Bibliothèque de validation de schémas TypeScript-first.

**Pourquoi ce choix** :
- **Validation stricte** : Validation côté serveur avant toute opération de base de données
- **Type-safety** : Inférence automatique des types TypeScript à partir des schémas
- **Messages d'erreur** : Erreurs de validation détaillées et exploitables
- **Composabilité** : Schémas réutilisables et combinables pour des validations complexes

**Bénéfices** : Sécurité renforcée (rejet des données invalides), meilleure expérience développeur, documentation implicite des formats de données.

### bcryptjs

**Rôle** : Bibliothèque de hachage de mots de passe avec algorithme bcrypt.

**Pourquoi ce choix** :
- **Sécurité** : Algorithme bcrypt conçu spécifiquement pour le hachage de mots de passe, avec coût ajustable (10 rounds)
- **Résistance aux attaques** : Protection contre les attaques par force brute et les rainbow tables
- **Standard** : Algorithme largement reconnu et éprouvé dans l'industrie

**Bénéfices** : Protection des identifiants utilisateurs même en cas de compromission de la base de données.

### Docker (multi-stage build)

**Rôle** : Containerisation de l'application pour un déploiement reproductible et isolé.

**Pourquoi ce choix** :
- **Reproductibilité** : Environnement identique entre développement, staging et production
- **Optimisation** : Build multi-stage réduit la taille de l'image finale (seulement les fichiers nécessaires)
- **Isolation** : Isolation des dépendances et de la configuration système
- **Portabilité** : Déploiement sur n'importe quelle plateforme supportant Docker

**Bénéfices** : Déploiements fiables, images optimisées, facilité de scaling horizontal.

### XLSX (SheetJS)

**Rôle** : Génération de fichiers Excel pour l'export des rapports.

**Pourquoi ce choix** :
- **Compatibilité** : Format Excel largement accepté par les utilisateurs métier
- **Flexibilité** : Génération de classeurs multi-feuilles avec formatage personnalisé
- **Performance** : Génération efficace même pour des volumes importants de données

**Bénéfices** : Intégration naturelle dans les workflows existants des utilisateurs, pas de dépendance à des outils externes.

---

## Choix techniques et patterns de conception

### Pattern : Pool de connexions singleton

**Implémentation** : Le module `/lib/db.ts` expose une fonction `getPool()` qui retourne une instance unique de Pool, créée à la première utilisation et réutilisée ensuite.

**Raison** : Évite la création répétée de pools de connexions, optimise l'utilisation des ressources, et garantit une configuration centralisée.

**Impact** : Performance améliorée (réutilisation des connexions), cohérence de configuration, facilité de maintenance (un seul point de modification).

### Pattern : Transactions SQL atomiques

**Implémentation** : Les opérations multi-étapes (création d'évaluations avec 12 rubriques, remplacement d'évaluations existantes) sont encapsulées dans des transactions SQL explicites (`BEGIN` / `COMMIT` / `ROLLBACK`).

**Raison** : Garantit l'atomicité : soit toutes les opérations réussissent, soit aucune n'est appliquée. Préserve l'intégrité de la base de données même en cas d'erreur partielle.

**Impact** : Intégrité des données garantie, pas d'états incohérents, récupération automatique en cas d'échec.

### Pattern : Validation en deux couches

**Implémentation** : Validation côté client (pour une expérience utilisateur fluide) combinée à une validation côté serveur stricte avec Zod (pour la sécurité).

**Raison** : La validation côté client améliore l'expérience utilisateur (feedback immédiat), mais ne peut pas être fiable pour la sécurité. La validation côté serveur est la seule source de vérité.

**Impact** : Sécurité renforcée (rejet des données malformées), meilleure expérience utilisateur, cohérence des données garantie.

### Pattern : Soft Delete (suppression logique)

**Implémentation** : Colonne `deleted_at` ajoutée aux tables critiques, avec module utilitaire `/lib/soft-delete.ts` qui construit dynamiquement les clauses WHERE pour exclure les éléments supprimés.

**Raison** : Permet la restauration d'éléments supprimés par erreur, préserve l'historique pour l'audit, et évite les problèmes d'intégrité référentielle.

**Impact** : Récupération possible des données, traçabilité complète, flexibilité opérationnelle.

### Pattern : Migrations versionnées

**Implémentation** : Scripts SQL numérotés séquentiellement dans `/migrations`, exécutés par un script TypeScript qui gère les erreurs idempotentes (tables/index déjà existants).

**Raison** : Permet l'évolution contrôlée du schéma de base de données, avec historique des changements et application reproductible entre environnements.

**Impact** : Cohérence entre environnements, traçabilité des changements de schéma, déploiements fiables.

### Pattern : Séparation des responsabilités (SoC)

**Implémentation** : Organisation modulaire avec séparation claire entre présentation (`/app`), logique métier (`/lib`), et données (migrations, requêtes SQL).

**Raison** : Facilite la maintenance, les tests, et l'évolution. Chaque module a une responsabilité unique et bien définie.

**Impact** : Code plus lisible, tests plus faciles, modifications isolées (changement dans un module n'affecte pas les autres).

### Pattern : Configuration centralisée

**Implémentation** : Variables d'environnement pour la configuration (DATABASE_URL, etc.), avec validation au démarrage (erreur explicite si variable manquante).

**Raison** : Séparation entre code et configuration, facilité d'adaptation aux différents environnements, sécurité (pas de secrets dans le code).

**Impact** : Déploiements flexibles, sécurité renforcée, configuration claire et documentée.

### Pattern : Gestion d'erreurs structurée

**Implémentation** : Try-catch explicites dans les routes API, avec gestion différenciée des erreurs (ZodError → 400, erreurs DB → 500, avec messages appropriés).

**Raison** : Permet de retourner des réponses HTTP cohérentes, facilite le débogage, et améliore l'expérience utilisateur (messages d'erreur clairs).

**Impact** : Débogage facilité, meilleure expérience utilisateur, logs exploitables.

---

## Gestion de la qualité, de la robustesse et de la sécurité

### Bonnes pratiques de qualité de code

**TypeScript strict** : Configuration `strict: true` active toutes les vérifications de type strictes, forçant une discipline de codage rigoureuse et détectant les erreurs potentielles à la compilation.

**Validation stricte des entrées** : Toutes les données utilisateur sont validées avec Zod avant traitement, avec rejet explicite des données invalides (code HTTP 400) plutôt que des erreurs silencieuses.

**Requêtes SQL paramétrées** : Toutes les requêtes utilisent des paramètres (`$1, $2, ...`) plutôt que la concaténation de strings, éliminant le risque d'injection SQL.

**Gestion explicite des erreurs** : Pas de `catch (error)` générique sans traitement. Chaque erreur est typée, loggée de manière appropriée, et transformée en réponse HTTP cohérente.

**Contraintes au niveau base de données** : Les contraintes CHECK, UNIQUE, et FOREIGN KEY garantissent l'intégrité même si une validation applicative est contournée.

### Approche globale de la sécurité

**Authentification par tokens** : Système de sessions avec tokens cryptographiquement sécurisés (32 bytes aléatoires en hexadécimal), stockés côté serveur avec expiration (7 jours). Les tokens sont transmis via header Authorization ou cookie, avec vérification systématique.

**Hachage des mots de passe** : Utilisation de bcrypt avec 10 rounds, garantissant que même en cas de compromission de la base de données, les mots de passe ne peuvent pas être récupérés en clair.

**Contrôle d'accès basé sur les rôles** : Système de rôles hiérarchique (agent < superviseur < admin) avec vérification systématique des permissions avant toute opération sensible.

**Validation et sanitization** : Toutes les entrées utilisateur sont validées (Zod) et sanitizées (fonctions dédiées pour strings et nombres) avant stockage.

**Protection CSRF implicite** : Next.js fournit une protection CSRF par défaut pour les requêtes POST/PUT/DELETE.

**Mode maintenance** : Possibilité de suspendre l'accès à l'application sans redéploiement, utile pour les opérations de maintenance planifiées.

### Prévention des erreurs et stabilité

**Transactions atomiques** : Les opérations multi-étapes sont encapsulées dans des transactions, avec rollback automatique en cas d'erreur, garantissant qu'il n'y a jamais d'état partiel.

**Gestion du pool de connexions** : Configuration du pool avec limites (max 20 connexions), timeouts (30s inactivité, 5s connexion), et gestion d'erreurs sur les connexions idle, évitant les fuites de ressources.

**Détection de doublons** : Vérification explicite avant insertion pour détecter les évaluations existantes, avec confirmation utilisateur avant remplacement.

**Validation de complétude** : Vérification côté client et serveur que toutes les rubriques d'un volet sont évaluées avant enregistrement.

**Gestion des erreurs de migration** : Le script de migration ignore les erreurs idempotentes (table/index déjà existant) tout en signalant les erreurs critiques, permettant des exécutions répétées sans échec.

**Logs structurés** : Utilisation de `console.error` avec contexte pour faciliter le débogage en production.

### Fiabilité opérationnelle

**Déploiement automatisé** : Scripts d'entrée Docker qui exécutent automatiquement les migrations au démarrage, garantissant que la base de données est toujours à jour.

**Mode standalone Next.js** : Build optimisé qui inclut uniquement les dépendances nécessaires, réduisant la taille de l'image et améliorant les temps de démarrage.

**Health check** : Route `/api/health` pour vérifier la disponibilité de l'application et de la base de données.

**Gestion gracieuse des erreurs de connexion** : Messages d'erreur explicites en cas d'échec de connexion à la base de données, avec instructions de dépannage.

---

## Évolutivité & maintenabilité

### Capacité d'évolution

**Architecture modulaire** : La séparation en modules (`/lib`, `/app`, `/migrations`) permet d'ajouter de nouvelles fonctionnalités sans modifier le code existant. Par exemple, l'ajout d'un nouveau volet d'évaluation ne nécessite que l'ajout de données de référence, pas de modification du code de saisie.

**Schéma de base de données extensible** : Les contraintes sont conçues pour permettre l'ajout de nouvelles tables ou colonnes sans impact sur les données existantes. Le système de migrations versionnées facilite l'évolution progressive.

**API RESTful cohérente** : Les routes API suivent des conventions claires, facilitant l'ajout de nouveaux endpoints sans casser l'existant.

**Séparation des préoccupations** : La logique métier est isolée dans `/lib`, permettant de modifier l'implémentation sans toucher à l'interface utilisateur ou aux routes API.

### Facilité d'ajout de fonctionnalités

**Composants réutilisables** : Les composants React sont conçus pour être réutilisables (Navigation, ToastProvider), facilitant l'ajout de nouvelles pages avec une cohérence visuelle.

**Modules utilitaires extensibles** : Les modules dans `/lib` sont conçus pour être étendus. Par exemple, le module de validation peut être étendu avec de nouveaux schémas Zod sans modifier les schémas existants.

**Système de rôles flexible** : L'ajout de nouveaux rôles ou de nouvelles permissions peut se faire en étendant le système de rôles hiérarchique existant.

**Export extensible** : Le système d'export Excel est conçu pour être étendu (ajout de nouveaux formats, nouvelles colonnes) sans refonte majeure.

### Lisibilité et organisation pour une équipe

**Structure claire** : L'organisation du projet est intuitive, avec des dossiers dédiés à chaque type de ressource. Un nouveau développeur peut rapidement comprendre où se trouve chaque élément.

**Conventions de nommage cohérentes** : Les fichiers et fonctions suivent des conventions claires (camelCase pour les fonctions, PascalCase pour les composants, kebab-case pour les routes).

**Documentation implicite** : Le code TypeScript avec types explicites sert de documentation. Les noms de fonctions et variables sont explicites (`getPool`, `verifyAuth`, `createSession`).

**Séparation des préoccupations** : Chaque module a une responsabilité unique, facilitant la compréhension et la modification.

**Commentaires stratégiques** : Les commentaires sont présents uniquement là où nécessaire (explications de logique complexe, raisons de choix techniques), évitant le bruit.

---

## Positionnement professionnel

### Niveau d'expertise démontré

Cette architecture reflète une **maîtrise approfondie** des principes de conception logicielle et des bonnes pratiques de l'industrie :

**Architecture pensée** : Chaque choix technique est justifié et cohérent avec l'ensemble. L'utilisation de transactions SQL, de validation en deux couches, et de patterns modulaires démontre une compréhension solide des enjeux de robustesse et de maintenabilité.

**Sécurité intégrée** : La sécurité n'est pas une réflexion après-coup, mais une préoccupation dès la conception (hachage des mots de passe, validation stricte, requêtes paramétrées, contrôle d'accès).

**Gestion des erreurs mature** : La gestion d'erreurs est structurée, avec des réponses HTTP appropriées et des logs exploitables, démontrant une expérience en production.

**Optimisation réfléchie** : Les index de base de données sont stratégiques (sur les colonnes fréquemment filtrées), le pool de connexions est configuré de manière optimale, et le build Docker est optimisé (multi-stage).

### Capacité à livrer et maintenir des systèmes complexes

**Robustesse opérationnelle** : L'utilisation de transactions, de soft delete, et de migrations versionnées démontre une compréhension des enjeux de production (intégrité des données, récupération après erreur, évolution contrôlée).

**Maintenabilité à long terme** : L'architecture modulaire, la séparation des responsabilités, et l'utilisation de TypeScript facilitent la maintenance et l'évolution par une équipe.

**Déploiement professionnel** : La containerisation Docker, les scripts d'entrée automatisés, et le mode standalone Next.js démontrent une maîtrise des pratiques de déploiement modernes.

**Documentation implicite** : Le code est auto-documenté par sa structure et ses types, réduisant le besoin de documentation externe et facilitant l'onboarding.

### Ce que cette réalisation dit du concepteur

Cette architecture témoigne d'un **niveau d'expertise senior** qui va au-delà de la simple capacité à écrire du code fonctionnel :

**Vision systémique** : Le concepteur comprend les interactions entre les différentes couches (présentation, API, logique métier, données) et conçoit des solutions cohérentes à l'échelle du système.

**Pragmatisme** : Les choix techniques sont équilibrés entre simplicité et robustesse. Pas de sur-ingénierie, mais pas de compromis sur la qualité non plus.

**Expérience production** : La prise en compte des aspects opérationnels (migrations, déploiement, gestion d'erreurs, logs) démontre une expérience réelle de la mise en production.

**Discipline de développement** : L'utilisation systématique de TypeScript strict, de validation, et de patterns cohérents démontre une discipline de développement qui garantit la qualité sur le long terme.

**Capacité d'évolution** : L'architecture est conçue pour évoluer, pas seulement pour fonctionner. Cette vision à long terme est caractéristique d'un développeur expérimenté.

---

## Conclusion

Cette architecture démontre une **maîtrise technique complète** des enjeux de conception, de sécurité, de performance et de maintenabilité. Elle peut servir de référence pour des projets similaires et témoigne d'un niveau d'expertise permettant de concevoir, livrer et maintenir des systèmes complexes en production.

Le projet illustre une approche professionnelle où chaque décision technique est réfléchie, justifiée, et alignée avec les meilleures pratiques de l'industrie. C'est une réalisation qui inspire confiance et qui peut être confiée, maintenue ou étendue par une équipe de développeurs expérimentés.

