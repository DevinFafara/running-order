# RO Planner — Backend API

Mini serveur Node/Express pour la persistance des Running-Orders utilisateurs.

## Installation

```bash
cd backend
npm install
```

## Lancement

```bash
# Développement (pas de vérification SSO)
node server.js

# Production
NODE_ENV=production node server.js
```

Le serveur écoute sur le port `3001` par défaut (configurable via `PORT`).

## Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/users` | Liste des utilisateurs opt-in (communauté) |
| `GET` | `/api/ro/:username` | Lire le RO d'un utilisateur |
| `POST` | `/api/ro/:username` | Sauvegarder le RO (auth requise) |
| `DELETE` | `/api/ro/:username` | Supprimer le RO (auth requise) |
| `GET` | `/api/admin/rebuild-index` | Reconstruire l'index depuis les fichiers |

## Structure des données

```
backend/
├── server.js
├── package.json
└── data/
    ├── index.json          ← Index global (users opt-in, count, etc.)
    └── users/
        ├── alice.json      ← Données individuelles
        └── bob.json
```

Chaque fichier utilisateur :
```json
{
  "username": "alice",
  "avatar_url": null,
  "favorites": "<LZString compressed>",
  "contacts": [
    { "username": "bob", "favorites": "<LZString>", "importedAt": "..." }
  ],
  "community_opt_in": true,
  "favorites_count": 14,
  "updated_at": "2026-04-29T08:36:34.900Z"
}
```

## Déploiement (nginx)

Ajouter au bloc `server` nginx :

```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Auth SSO Discourse (production)

En développement, le middleware `verifyAuth` est désactivé.

En production (`NODE_ENV=production`), il faut compléter le middleware dans `server.js` pour :
1. Vérifier le cookie/token Discourse de la requête
2. Extraire le username authentifié
3. Comparer avec le `:username` de la route

Voir le bloc `PRODUCTION: À compléter par l'admin` dans `server.js`.
