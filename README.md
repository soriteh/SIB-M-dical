# Gestion Médicale

Application de gestion pour clinique ou centre médical, conçue avec React, TypeScript, Vite et Supabase.

## État du dépôt

Ce dépôt contient le socle initial du projet : interface de démarrage, configuration TypeScript/Vite, exemple de variables d'environnement et première migration SQL. Il ne constitue pas encore une application médicale prête pour la production.

## Prérequis

- Node.js 20+
- npm
- Projet Supabase de développement

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Renseigner dans `.env.local` l'URL Supabase et la clé publique/publishable du projet. Ne jamais ajouter de clé `service_role`, mot de passe ou secret dans le code client.

## Vérification

```bash
npm run typecheck
npm run build
```

## Base de données

Les migrations versionnées se trouvent dans `supabase/migrations`. Appliquer d'abord dans un projet Supabase de développement, après revue, avec Supabase CLI :

```bash
supabase link --project-ref VOTRE_PROJECT_REF
supabase db push
```

Ne pas appliquer de migration non vérifiée à une base contenant des données réelles.

## Architecture prévue

- Patients, rendez-vous et consultations
- Prescriptions, laboratoire et imagerie
- Pharmacie, stocks et approvisionnement
- Facturation, paiements, caisse et banque
- Hospitalisation, urgences et maternité
- Authentification, permissions, audit
- Mode PWA hybride avec IndexedDB et synchronisation contrôlée

## Sécurité

Les données de santé sont sensibles. Compléter et tester les politiques RLS, la séparation par établissement, l'audit, les sauvegardes et la synchronisation avant toute utilisation avec des patients réels. Le mode hors ligne ne confirme pas les paiements ou prescriptions tant que le serveur ne les a pas validés.
