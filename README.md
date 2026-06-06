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
- Visualisation dynamique du planning par jour et vue semaine
- Système de tags personnalisés (niveau d'intérêt + contexte)
- Gestion de créneaux personnels
- Statistiques festivalier ("Hellfest DNA")
- Export de playlists Spotify/Deezer
- Partage de RO entre utilisateurs

### Carte interactive (MapView)
- Image du site Hellfest (`hf-map.png`, 1376×768px)
- Zoom 30–150%, centrage initial sur Cathédrale (Mardi/Mercredi : Metal Corner)
- Markers de scènes avec statut live/prochain/inactif (polling)
- Markers POI (visibles à partir de 70% de zoom)
- Mode "Ma position" : tap sur la carte → position partagée au groupe
- Markers des membres du groupe actif affichés en temps réel

### Groupes & Localisation
- Groupes éphémères accessibles sans compte (UUID localStorage)
- Partage de position sur la carte : mode **manuel** (tap) ou **GPS automatique**
- GPS : `getCurrentPosition` immédiat puis toutes les **5 minutes** (économie batterie)
- Conversion GPS → pixel via transformation affine par moindres carrés (10 GCPs dans `public/gcps.json`)
- Précision affichée en temps réel (`±Xm`), fallback automatique en manuel si permission refusée
- Polling membres 30s, positions expirées après 2h
- Panel dans le menu principal

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
│   │   ├── panels/       # ContactsPanel, GroupsPanel, CommunityPanel...
│   │   ├── modals/       # ProfileModal, ConsentModal...
│   │   ├── layout/       # HeaderBar, Navigation
│   │   └── common/       # GroupCard, SearchBand...
│   ├── hooks/            # useLineup, useAuth, useGroups, useNotifications, useGPS...
│   ├── context/          # CheckedStateContext
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
        ├── anon/         # Positions des membres de groupes
        └── groups/       # Groupes de festivaliers
```

## Déploiement

L'app est hébergée sur les serveurs du forum Hellfest (même domaine que `forum.hellfest.fr`). L'auth Discourse utilise le cookie de session `_t` — aucune redirection OAuth.

Le backend tourne dans un container Docker géré via Portainer. Variables d'environnement à configurer : `NODE_ENV`, `DISCOURSE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ADMIN_SECRET`.

---

*Développé pour les Hellbangers.* 🤘
