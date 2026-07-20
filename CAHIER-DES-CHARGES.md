# CAHIER DES CHARGES
## 2REF-AUTO
### Plateforme intelligente d'automatisation des tâches du cabinet fiscal 2REF

**Version :** 1.1 — Juillet 2026  
**État du projet :** MVP interface + authentification en production ; données métier en cours de branchement base PostgreSQL

---

## 1. Présentation du projet

### Nom du projet

**2REF-AUTO** (nom commercial interne : **FacturIA**)

### Slogan

Automatisation intelligente des processus du cabinet fiscal 2REF

### Type de projet

Application Web Métier Interne (Enterprise Business Automation Platform)

### Description

2REF-AUTO est une plateforme web interne développée pour le cabinet fiscal **2REF Expertise Fiscale** afin d'automatiser, centraliser et sécuriser l'ensemble des processus administratifs, fiscaux et commerciaux du cabinet.

L'objectif est de réduire les tâches répétitives, d'améliorer la productivité des collaborateurs et de faciliter la gestion quotidienne des clients, des devis, des factures, des courriers administratifs et des différents documents produits par le cabinet.

La plateforme offre une interface moderne, élégante et intuitive, comparable aux meilleurs logiciels SaaS professionnels, avec une **prévisualisation en temps réel** des documents et une **génération PDF** fidèle aux modèles officiels du cabinet.

### Périmètre organisationnel

L'application est conçue pour un **cabinet unique** (modèle singleton) :

- Une seule entité **Company** : « 2REF Expertise Fiscale »
- Plusieurs **collaborateurs** (`staff_members`), chacun avec un compte Supabase Auth
- Les **clients** et le **catalogue prestations** sont partagés entre tous les collaborateurs
- Les **documents** sont rattachés à leur **créateur** ; les administrateurs voient l'ensemble du cabinet

---

## 2. Objectifs

L'application devra permettre de :

- Centraliser toutes les informations des clients
- Automatiser la création des devis
- Automatiser la création des factures
- Générer automatiquement les courriers administratifs
- Gérer le catalogue des prestations du cabinet
- Générer des documents PDF professionnels
- Assurer le suivi des activités des collaborateurs
- Archiver les documents de manière sécurisée
- Rechercher rapidement toutes les informations du cabinet
- Réduire considérablement les tâches manuelles et les erreurs de saisie
- **Identifier et tracer le collaborateur créateur de chaque document**
- **Gérer les accès collaborateurs avec rôles member / admin**

---

## 3. Vision du produit

2REF-AUTO doit devenir le centre de pilotage numérique du cabinet fiscal 2REF.

L'application est conçue comme une véritable plateforme métier capable d'évoluer progressivement vers un ERP interne complet.

À terme, elle pourra intégrer des modules supplémentaires tels que :

- Gestion des dossiers fiscaux
- Gestion comptable
- Gestion documentaire (GED)
- Gestion avancée des collaborateurs et des droits
- Tableau de bord décisionnel
- Signature électronique
- Archivage numérique
- Génération automatique de rapports
- Intelligence artificielle pour l'assistance documentaire
- Automatisation des workflows administratifs

---

## 4. Modules fonctionnels

### 4.1 Authentification et collaborateurs

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Connexion email / mot de passe | ✅ Implémenté | Page `/login`, validation Zod |
| Inscription collaborateur | ✅ Implémenté | Page `/signup` : prénom, nom, poste, email, téléphone, mot de passe |
| Connexion Google (OAuth) | ✅ Implémenté | Bouton OAuth en bas de formulaire |
| Magic link email | ✅ Implémenté | Connexion sans mot de passe |
| Callback OAuth serveur (PKCE) | ✅ Implémenté | Route `/auth/callback` — échange du code côté serveur |
| Synchronisation profil → PostgreSQL | ✅ Implémenté | Table `staff_members` via `POST /api/staff/sync` |
| Rafraîchissement session | ✅ Implémenté | Middleware Supabase SSR sur chaque requête |
| Rôles member / admin | 🔶 Partiel | Enum Prisma + sync ; filtrage documents prévu côté serveur, non appliqué UI |
| Protection des routes privées | ⏳ À faire | Routes `/_app/*` accessibles sans garde auth |
| Réinitialisation mot de passe | ⏳ À faire | Non implémenté |
| Déconnexion Supabase | ⏳ À faire | Lien vers `/login` sans invalidation de session |

**Profil collaborateur en base (`staff_members`) :**

- `id` = UUID Supabase Auth
- `email`, `firstName`, `lastName`, `jobTitle`, `phone`, `avatarUrl`
- `role` : `member` (défaut) ou `admin`

### 4.2 Dashboard

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Vue d'ensemble activité | ✅ UI | KPIs : clients, devis, factures, CA |
| Statistiques temps réel | 🔶 UI mock | Données issues du store Zustand (seed) |
| Graphiques interactifs | ✅ UI | Recharts : revenus, documents/semaine, répartition statuts |
| Documents récents | ✅ UI | Liste des 6 derniers documents |
| Activités récentes | ✅ UI | Fil d'activité depuis le store |
| Notifications importantes | ✅ UI | Page `/notifications` dédiée |
| Salutation personnalisée | ⏳ À faire | Texte statique, non lié à la session |

### 4.3 Gestion des clients

| Fonctionnalité | Statut |
|----------------|--------|
| Liste, création, modification, fiche détail | ✅ UI (mock Zustand) |
| Recherche et filtres | ✅ UI |
| Historique documents par client | ✅ UI |
| Persistance PostgreSQL | ⏳ Schéma Prisma prêt, UI non connectée |

**Champs client :** raison sociale, forme juridique, NIF, NIU, RCCM, contact, email, téléphone, adresse, ville, pays (défaut Gabon)

### 4.4 Catalogue des prestations

| Fonctionnalité | Statut |
|----------------|--------|
| CRUD prestations | ✅ UI (mock) |
| Code, description, unité, prix HT, TVA, catégorie | ✅ UI |
| Persistance PostgreSQL | ⏳ Schéma Prisma prêt |

### 4.5 Gestion des devis

| Fonctionnalité | Statut |
|----------------|--------|
| Liste avec filtres et statuts | ✅ UI |
| Création assistée (éditeur) | ✅ UI |
| Prévisualisation temps réel | ✅ UI |
| Calcul automatique montants / TVA | ✅ UI |
| Export PDF | ✅ Implémenté |
| Archivage | ✅ UI |
| Traçabilité créateur | 🔶 UI (avatar colonne) ; `createdById` hardcodé à la création |
| Persistance PostgreSQL | ⏳ Schéma + server functions prêts |

### 4.6 Gestion des factures

| Fonctionnalité | Statut |
|----------------|--------|
| Liste, création, détail | ✅ UI |
| Prévisualisation temps réel | ✅ UI |
| Calcul automatique des montants | ✅ UI |
| Export PDF | ✅ Implémenté |
| Statuts : brouillon, envoyée, payée, en retard, archivée… | ✅ UI |
| Persistance PostgreSQL | ⏳ Schéma prêt |

### 4.7 Factures pro forma

| Fonctionnalité | Statut |
|----------------|--------|
| Module dédié `/proformas` | ✅ UI |
| Éditeur, preview, PDF | ✅ UI |
| Persistance PostgreSQL | ⏳ Schéma prêt |

### 4.8 Courriers administratifs

| Fonctionnalité | Statut |
|----------------|--------|
| Module lettres `/letters` | ✅ UI |
| Éditeur dédié (`LetterEditor`) | ✅ UI |
| Champs : objet, salutation, corps, formule de politesse, signataire | ✅ UI + schéma Prisma |
| Preview et export PDF | ✅ UI |
| Persistance PostgreSQL | ⏳ Schéma prêt |

### 4.9 Modèles de documents

| Type | Statut |
|------|--------|
| Facture | ✅ Preview + PDF |
| Devis | ✅ Preview + PDF |
| Facture Pro forma | ✅ Preview + PDF |
| Lettre administrative | ✅ Preview + PDF |
| Page modèles `/templates` | ✅ UI (aperçus) |

### 4.10 Centre documentaire et archives

| Fonctionnalité | Statut |
|----------------|--------|
| Page archives `/archive` | ✅ UI |
| Classement par type et statut | ✅ UI |
| Recherche globale `/search` | ✅ UI |
| Téléchargement PDF | ✅ Implémenté |

### 4.11 Paramètres

| Fonctionnalité | Statut |
|----------------|--------|
| Informations cabinet (NIF, NIU, RCCM, coordonnées, banque) | ✅ UI (mock) |
| Logo et identité visuelle | ✅ UI |
| Préférences | ✅ UI |
| Persistance table `companies` | ⏳ Schéma prêt, seed SQL disponible |

### 4.12 Profil collaborateur

| Fonctionnalité | Statut |
|----------------|--------|
| Page `/profile` | ✅ UI statique |
| Données depuis session + `staff_members` | ⏳ À brancher |

---

## 5. Identité visuelle

Le design reflète les valeurs du cabinet :

- Professionnalisme
- Confiance
- Modernité
- Rigueur
- Élégance

L'interface est **premium** avec :

- Glassmorphism léger (effet aurora / fond dégradé)
- Dégradés modernes
- Grandes cartes (`StatCard`, cartes dashboard)
- Espaces généreux
- Animations fluides (Framer Motion)
- Ombres élégantes
- Micro-interactions soignées
- Composants shadcn/ui + Radix
- Avatars collaborateurs (`StaffAvatar`) avec initiales ou photo

Pages d'authentification : coque dédiée `AuthShell`, icônes marque Google et email, affichage/masquage mot de passe.

---

## 6. Technologies

### Front-end

| Technologie | Version / usage |
|-------------|-----------------|
| **TanStack Start** | Framework full-stack SSR (remplace Next.js App Router) |
| **Vite** | Build et dev server |
| **React** | 19 |
| **TypeScript** | 5.8 |
| **TanStack Router** | Routing file-based |
| **TanStack Query** | Installé (provider global, branchement data à venir) |
| **TanStack Table** | Listes tabulaires |
| **Tailwind CSS** | 4 |
| **shadcn/ui + Radix UI** | Composants UI |
| **Framer Motion** | Animations |
| **Lucide React** | Icônes |
| **Zustand** | État client (données métier mock en V1) |
| **React Hook Form + Zod** | Formulaires et validation |
| **Recharts** | Graphiques dashboard |
| **jsPDF + html-to-image** | Export PDF (capture DOM → A4) |

### Back-end et données

| Technologie | Usage |
|-------------|--------|
| **Supabase Auth** | Authentification (email, Google OAuth, magic link, PKCE) |
| **Supabase SSR** (`@supabase/ssr`) | Cookies session côté serveur |
| **PostgreSQL** (Supabase) | Base de données relationnelle |
| **Prisma 6** | ORM, schéma, migrations, client `@prisma/client` |
| **Nitro** | Bundle SSR / déploiement (via config Lovable) |
| **Server functions** | TanStack Start (`createServerFn`) pour accès Prisma |
| **API routes** | `POST /api/staff/sync` |

### Modèle de données (Prisma)

```
Company (singleton cabinet)
StaffMember ←→ auth.users (UUID Supabase)
Client
Service
Document (quotation | invoice | proforma | letter)
DocumentLine
Activity
Notification
```

**Enums :** `DocumentType`, `DocumentStatus`, `ActivityKind`, `NotificationType`, `StaffRole`

### Variables d'environnement

| Variable | Rôle |
|----------|------|
| `VITE_SUPABASE_URL` | Client navigateur |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client navigateur |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Serveur (fallback sur `VITE_*`) |
| `DATABASE_URL` | Prisma — pooler transactionnel Supabase (port 6543) |
| `DIRECT_URL` | Prisma `directUrl` |

### Scripts opérationnels

| Script | Commande |
|--------|----------|
| Génération client Prisma | `pnpm prisma:generate` |
| Vérification connexion DB | `pnpm prisma:verify` |
| Migrations | `pnpm prisma:migrate` / `prisma:deploy` |
| Studio Prisma | `pnpm prisma:studio` |
| Application migrations SQL manuelles | `scripts/apply-*.mjs`, `scripts/list-staff.mjs` |

---

## 7. Architecture applicative

```
┌─────────────────────────────────────────────────────────┐
│  Navigateur — React 19 + TanStack Router                │
│  Zustand (données métier mock) + TanStack Query (prêt)  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  TanStack Start SSR — Vite + Nitro                      │
│  Middleware : erreurs + session Supabase                │
│  Routes API + Server Functions (Prisma)                 │
└────────────┬───────────────────────────┬────────────────┘
             │                           │
┌────────────▼──────────┐   ┌────────────▼──────────────┐
│  Supabase Auth        │   │  PostgreSQL (Supabase)     │
│  OAuth / Email / PKCE │   │  Prisma ORM                │
│  staff_members sync   │   │  clients, documents, …     │
└───────────────────────┘   └───────────────────────────┘
```

### État d'avancement par couche

| Couche | État |
|--------|------|
| Interface utilisateur (30+ pages) | ✅ Complète |
| Export PDF | ✅ Fonctionnel |
| Authentification Supabase | ✅ Fonctionnelle |
| Profils collaborateurs en base | ✅ Fonctionnel |
| Schéma PostgreSQL complet | ✅ Déployé |
| Server functions Prisma (CRUD, filtrage rôles) | 🔶 Codées, non consommées par l'UI |
| Données métier persistées | ⏳ Prochaine phase |
| Garde auth + session UI | ⏳ Prochaine phase |

---

## 8. Règles métier — accès et documents

### Rôles

- **member** : voit et gère ses propres documents ; accès clients et catalogue partagés
- **admin** : voit tous les documents du cabinet

### Traçabilité

- Chaque document possède un `createdById` → `staff_members`
- Affichage du créateur : avatar + nom dans les listes et fiches détail (`DocumentCreatorCard`, `StaffAvatar`)

### Filtrage serveur (prévu)

Server functions `listDocumentsForStaff` et `getDocumentForStaff` appliquent le filtre selon le rôle — à brancher sur l'interface.

---

## 9. Vision à long terme

2REF-AUTO n'est pas uniquement un logiciel de facturation.

Il s'agit de la future plateforme numérique du cabinet 2REF, capable de centraliser l'ensemble des processus métiers et d'évoluer progressivement vers une solution ERP complète dédiée aux activités fiscales, comptables et administratives.

### Prochaines étapes techniques (roadmap V1.2)

1. Garde d'authentification sur toutes les routes `/_app/*`
2. Affichage profil collaborateur connecté (topbar, dashboard, profil)
3. Remplacement du store Zustand mock par les server functions Prisma
4. CRUD clients, services, documents en base PostgreSQL
5. Attribution automatique de `createdById` à la création de document
6. Application effective du filtrage admin / member
7. Déconnexion Supabase et réinitialisation mot de passe
8. Connexion des paramètres cabinet à la table `companies`

### Évolutions futures

- Automatisation des workflows
- Gestion électronique des documents (GED)
- Planification des missions
- Tableaux de bord décisionnels avancés
- Analyse des performances
- Signature électronique
- Intégration services fiscaux et bancaires
- Assistants IA pour le traitement documentaire

---

## 10. Livrables actuels (Juillet 2026)

| Livrable | Description |
|----------|-------------|
| Application web | `pnpm dev` → http://localhost:8080 |
| Pages auth | `/login`, `/signup`, `/auth/callback` |
| Espace applicatif | Dashboard, clients, catalogue, devis, factures, pro forma, lettres, modèles, archives, recherche, notifications, profil, paramètres |
| Schéma base de données | `prisma/schema.prisma` + migrations SQL |
| Sync collaborateurs | API + scripts de migration staff |
| Export PDF | Tous types de documents |

---

*Document mis à jour pour refléter l'état réel du dépôt `invoices-2ref` — stack TanStack Start, Supabase Auth, Prisma/PostgreSQL, interface FacturIA.*
