# Mise en service Supabase — Gestion Médicale

## Avertissement

Le dépôt contient une base de développement. Les politiques RLS de la première migration sont partielles : plusieurs tables restent volontairement sans politiques d'accès. Ne pas utiliser ce schéma avec des dossiers patients réels avant audit et tests d'autorisation.

## 1. Créer un projet Supabase

1. Créer un projet Supabase distinct pour le développement.
2. Conserver l'URL du projet et la clé publique/publishable du navigateur.
3. Ne jamais utiliser `service_role` dans le navigateur, les variables `VITE_*`, ou GitHub Pages.
4. Activer les protections d'authentification et configurer les URL de redirection autorisées.

## 2. Appliquer les migrations

Installer la Supabase CLI localement, puis exécuter depuis la racine du dépôt :

```bash
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase db push
```

Les migrations actuelles créent le socle et un profil à la création d'un utilisateur Auth. Elles ne créent volontairement aucune adhésion active à une clinique.

## 3. Accorder l'accès à une clinique

Un administrateur autorisé doit créer l'établissement et attribuer explicitement les adhésions après vérification de l'identité. Ne jamais permettre à un utilisateur de choisir lui-même son rôle via des métadonnées publiques d'inscription.

Le premier établissement et le premier administrateur doivent être provisionnés depuis une session SQL administrative protégée, avec l'identifiant Auth vérifié. Garder ces opérations dans une procédure contrôlée et journalisée.

## 4. Configurer GitHub Pages

Dans le dépôt GitHub : **Settings → Pages**, sélectionner **GitHub Actions** comme source.

Ajouter :
- Variable de dépôt `VITE_SUPABASE_URL` : URL du projet Supabase.
- Secret de dépôt `VITE_SUPABASE_ANON_KEY` : clé publique/publishable prévue pour le client.

Relancer le workflow **Deploy Gestion Médicale to GitHub Pages** depuis l'onglet Actions. L'URL attendue pour ce dépôt est `https://soriteh.github.io/SIB-M-dical/`, sous réserve de l'activation effective de GitHub Pages et du succès du workflow.

## 5. Vérifications obligatoires

- Tester la connexion avec un compte autorisé et un compte sans adhésion.
- Vérifier qu'un utilisateur de la clinique A ne lit aucune donnée de la clinique B.
- Tester les requêtes directes à l'API, pas uniquement l'interface.
- Confirmer que les tables sans politiques restent inaccessibles.
- Tester les migrations et la restauration dans un environnement non productif.
- N'utiliser aucune donnée médicale réelle avant validation de la sécurité, du consentement, de la conservation et des sauvegardes.

## État fonctionnel

L'interface de connexion Supabase est intégrée au frontend. Les modules métiers, l'autorisation fine par dossier, le stockage hors ligne chiffré et la synchronisation transactionnelle ne sont pas encore implémentés.
