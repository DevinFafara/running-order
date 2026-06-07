# Hellfest RO Planner

> **Version 2.0 (Vite + React)**

Guide interactif pour préparer et vivre le Running Order du Hellfest Open Air Festival.

## Démarrage rapide

```bash
# Frontend
npm install
npm run dev        # dev sur localhost:5173
npm run build      # build prod dans dist/

# Backend
cd backend
node server.js     # API sur localhost:3001
```

Variables d'environnement frontend (`.env.development`) :
```
VITE_MOCK_USER=guest      # 'guest' = utilisateur anonyme, 'alice'/'bob'/'charlie' = Discourse simulé
VITE_API_URL=http://localhost:3001/running-order/api
```

## Stack technique

- **React 18** + **Vite**
- **Context API** (state management)
- **LocalStorage** (persistence client)
- **PWA** (offline, installable)
- **Backend** : Node.js + Express, stockage JSON fichier, auth Discourse SSO

## Fonctionnalités

### Running Order

- Visualisation dynamique du planning par jour (DayView) et vue semaine (WeeklyView)
- Système de tags personnalisés (niveau d'intérêt + contexte)
- Gestion de créneaux personnels (avec boutons masquer/modifier dans la vue semaine)
- Statistiques festivalier ("Hellfest DNA")
- Export de playlists Spotify/Deezer
- Partage de RO entre utilisateurs
- WeeklyView : dropdown de filtres scènes, switch scènes annexes, filtre "Favoris / Tout le monde"
- Bouton filtre dans la barre de navigation DayView (à gauche du bouton Vue étendue/Scènes annexes), texte masqué sous 800px

### Navigation

- Toolbar avec 4 boutons : ajout d'événement (`fa-calendar-plus`), DayView (`fa-calendar-day`), WeeklyView (`fa-calendar-week`), MapView (`fa-map-location-dot`)
- Navigation directe (pas de toggle-retour vers DayView) — la vue active est mise en surbrillance
- Dernière vue utilisée persistée dans `localStorage` → restaurée au rechargement

### Carte interactive (MapView)

- Image du site Hellfest (`hf-map.png`, 1376×768px)
- Zoom 30–150%, centrage initial sur Cathédrale (Mardi/Mercredi : Metal Corner)
- Markers de scènes avec statut live/prochain/inactif (polling)
- Markers POI (visibles à partir de 70% de zoom)
- Mode "Ma position" : tap sur la carte → position partagée au crew
- Markers des membres du crew actif affichés en temps réel

### Crew & Localisation

- Crews éphémères accessibles sans compte (UUID localStorage)
- Nomenclature : "crew" désigne un groupe d'amis festivaliers (≠ "groupe" = band metal)
- Partage de position sur la carte : mode **manuel** (tap) ou **GPS automatique**
- GPS : `getCurrentPosition` immédiat puis toutes les **5 minutes** (économie batterie)
- Conversion GPS → pixel via transformation affine par moindres carrés (10 GCPs dans `public/gcps.json`)
- Précision affichée en temps réel (`±Xm`), fallback automatique en manuel si permission refusée
- Polling membres 30s, positions expirées après 2h
- Accessible depuis le menu principal (icône "Crew" dans ProfileModal)
- Le créateur du crew peut exclure des membres (bouton `fa-user-xmark` dans la liste des membres)

### RO Collaboratif de crew

- **"RO du crew"** : WeeklyView fusionnant les favoris de tous les membres avec pastilles colorées (initiales + niveau d'intérêt)
- Favoris encodés LZString dans `data/anon/{member_id}.json`, synchronisés automatiquement (debounce 1500ms) dès que l'utilisateur est dans ≥1 crew
- **Mode invité** : consultation du RO d'un autre utilisateur (depuis communauté, contacts ou crew)
  - Bascule automatiquement sur WeeklyView quelle que soit la vue courante
  - Cliquer l'icône MapView sort du mode invité et bascule sur la carte
  - Pastilles invité sur DayView et WeeklyView (initiales de l'invité) en plus des étoiles personnelles
  - Le tagging de groupes reste possible pour soi-même en mode invité (étoiles propres)
  - Toggle "En commun" pour estomper les groupes non communs
  - Toggle "Mes favoris" pour superposer ses propres favoris (pastilles combinées)
  - Bouton retour context-aware (MapView → retour carte, sinon retour simple)
  - Toggles "En commun" et "Mes favoris" remis à zéro à chaque changement d'invité
- **Mode RO partagé** : subtitle "RO partagé", toggle "Mes favoris" pour mettre en avant ses propres favoris
- **Onglet "Présents"** dans GroupCard (MapView/WeeklyView) : liste des membres du crew actif qui ont tagué ce groupe, avec leur niveau d'intérêt
- Par membre dans le panel Crew : bouton RO individuel (bascule WeeklyView en mode invité) et bouton Position (zoom MapView sur le membre)
- Message de consentement affiché à la création/adhésion d'un crew

### Composants communs

- `MemberBadges` : pastilles colorées (initiales + couleur niveau d'intérêt) extraites en composant autonome (`src/components/common/MemberBadges.jsx`), utilisé dans WeeklyView et DayView (Band.jsx)
- `TagMenu` et `GroupCard` : toujours basés sur les tags réels de l'utilisateur (`getUserBandTag`), pas sur l'état de l'invité

### Sync serveur (utilisateurs Discourse)

- Sauvegarde automatique du RO sur le serveur
- Mode communauté opt-in (partage de RO public)
- Notifications push (alarmes avant concerts)

## Structure du projet

```
running-order2/
├── src/
│   ├── components/
│   │   ├── views/        # DayView, WeeklyView, MapView
│   │   ├── panels/       # ContactsPanel, GroupsPanel (crew), CommunityPanel...
│   │   ├── modals/       # ProfileModal, ConsentModal...
│   │   ├── layout/       # HeaderBar, Navigation
│   │   └── common/       # GroupCard, Band, MemberBadges, TagMenu, SearchBand...
│   ├── hooks/            # useLineup, useAuth, useGroups, useNotifications, useGPS...
│   ├── context/          # CheckedStateContext
│   │   # Expose : state (displayState), userState (real), isGuestMode, guestRo,
│   │   # getBandTag (displayState), getUserBandTag (userState toujours)
│   ├── services/         # api.js
│   ├── utils/            # sharingUtils, statsUtils, gpsToMap...
│   └── constants/        # STAGES, STAGE_CONFIG, MAP_POIS...
├── public/
│   ├── hf-map.png        # Carte interactive du site
│   ├── gcps.json         # Points de contrôle GPS (10 GCPs, plan du site)
│   └── lineup.json       # Programmation
└── backend/
    ├── server.js
    └── data/
        ├── index.json
        ├── users/
        ├── anon/         # Positions + favoris des membres de crews
        └── groups/       # Fichiers de crews (naming technique conservé)
```

## Déploiement

L'app est hébergée sur les serveurs du forum Hellfest (même domaine que `forum.hellfest.fr`). L'auth Discourse utilise le cookie de session `_t` — aucune redirection OAuth.

Le backend tourne dans un container Docker géré via Portainer. Variables d'environnement à configurer : `NODE_ENV`, `DISCOURSE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ADMIN_SECRET`.

---

*Développé pour les Hellbangers.* 🤘
