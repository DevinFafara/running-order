const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data', 'users');
const INDEX_FILE = path.join(__dirname, 'data', 'index.json');

// ─── Ensure data directories exist ──────────────────────────────────────────
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(INDEX_FILE)) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify({ users: [] }, null, 2));
}

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// CORS: en dev, autoriser le frontend Vite (localhost:5173)
if (process.env.NODE_ENV !== 'production') {
    app.use(cors({ origin: true, credentials: true }));
} else {
    // En production, l'API est sur le même domaine — pas besoin de CORS
}

// ─── Auth Middleware ────────────────────────────────────────────────────────
// En dev: bypass, on fait confiance au :username de la route.
// En prod: l'admin remplacera ce middleware par la vérification du token
// Discourse (cookie de session, header X-Discourse-User, etc.)
function verifyAuth(req, res, next) {
    if (process.env.NODE_ENV !== 'production') {
        // Dev: on fait confiance au username de la route
        req.authenticatedUser = req.params.username;
        return next();
    }

    // ╔══════════════════════════════════════════════════════════════════╗
    // ║  PRODUCTION: À compléter par l'admin                          ║
    // ║  Vérifier le cookie/token Discourse et extraire le username.   ║
    // ║  Exemple:                                                      ║
    // ║    const discourseUser = verifyDiscourseSession(req);          ║
    // ║    if (!discourseUser) return res.status(401).json(...)        ║
    // ║    if (discourseUser !== req.params.username)                  ║
    // ║        return res.status(403).json(...)                        ║
    // ║    req.authenticatedUser = discourseUser;                      ║
    // ║    next();                                                     ║
    // ╚══════════════════════════════════════════════════════════════════╝
    req.authenticatedUser = req.params.username;
    next();
}

// ─── Mutex for index.json writes ────────────────────────────────────────────
// Prevents race conditions when two users save simultaneously
let indexLock = Promise.resolve();

function withIndexLock(fn) {
    const next = indexLock.then(() => fn()).catch((err) => {
        console.error('Index lock error:', err);
    });
    indexLock = next;
    return next;
}

// ─── Atomic file write ─────────────────────────────────────────────────────
function atomicWriteFile(filePath, data) {
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, data, 'utf-8');
    fs.renameSync(tmpPath, filePath);
}

// ─── Index helpers ──────────────────────────────────────────────────────────
function readIndex() {
    try {
        const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return { users: [] };
    }
}

function updateIndexEntry(userData) {
    return withIndexLock(() => {
        const index = readIndex();
        const existing = index.users.findIndex(u => u.username === userData.username);

        const entry = {
            username: userData.username,
            avatar_url: userData.avatar_url || null,
            community_opt_in: userData.community_opt_in || false,
            favorites_count: userData.favorites_count || 0,
            updated_at: userData.updated_at
        };

        if (existing >= 0) {
            index.users[existing] = entry;
        } else {
            index.users.push(entry);
        }

        atomicWriteFile(INDEX_FILE, JSON.stringify(index, null, 2));
    });
}

function removeIndexEntry(username) {
    return withIndexLock(() => {
        const index = readIndex();
        index.users = index.users.filter(u => u.username !== username);
        atomicWriteFile(INDEX_FILE, JSON.stringify(index, null, 2));
    });
}

// ─── Sanitize username ─────────────────────────────────────────────────────
function sanitizeUsername(username) {
    // Only allow alphanumeric, underscores, hyphens, dots
    return username.replace(/[^a-zA-Z0-9_\-\.]/g, '');
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/ro/:username — Lire le RO d'un utilisateur
app.get('/api/ro/:username', (req, res) => {
    const username = sanitizeUsername(req.params.username);
    const filePath = path.join(DATA_DIR, `${username}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'User not found' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // If the user is not opt-in and the requester is not the owner,
        // return only basic info (no favorites)
        // In dev mode, we skip this check
        if (process.env.NODE_ENV === 'production' &&
            !data.community_opt_in &&
            req.authenticatedUser !== username) {
            return res.status(403).json({ error: 'This user\'s RO is private' });
        }

        res.json(data);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        res.status(500).json({ error: 'Failed to read user data' });
    }
});

// POST /api/ro/:username — Sauvegarder le RO d'un utilisateur (auth requise)
app.post('/api/ro/:username', verifyAuth, async (req, res) => {
    const username = sanitizeUsername(req.params.username);

    if (req.authenticatedUser !== username) {
        return res.status(403).json({ error: 'You can only save your own RO' });
    }

    const filePath = path.join(DATA_DIR, `${username}.json`);

    const userData = {
        username,
        avatar_url: req.body.avatar_url || null,
        favorites: req.body.favorites || '',
        community_opt_in: req.body.community_opt_in ?? false,
        favorites_count: req.body.favorites_count ?? 0,
        updated_at: new Date().toISOString()
    };

    try {
        atomicWriteFile(filePath, JSON.stringify(userData, null, 2));
        await updateIndexEntry(userData);
        res.json({ success: true, updated_at: userData.updated_at });
    } catch (err) {
        console.error(`Error writing ${filePath}:`, err);
        res.status(500).json({ error: 'Failed to save user data' });
    }
});

// DELETE /api/ro/:username — Supprimer le RO d'un utilisateur (auth requise)
app.delete('/api/ro/:username', verifyAuth, async (req, res) => {
    const username = sanitizeUsername(req.params.username);

    if (req.authenticatedUser !== username) {
        return res.status(403).json({ error: 'You can only delete your own RO' });
    }

    const filePath = path.join(DATA_DIR, `${username}.json`);

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        await removeIndexEntry(username);
        res.json({ success: true });
    } catch (err) {
        console.error(`Error deleting ${filePath}:`, err);
        res.status(500).json({ error: 'Failed to delete user data' });
    }
});

// GET /api/users — Lister les utilisateurs opt-in (lecture de l'index)
app.get('/api/users', (req, res) => {
    try {
        const index = readIndex();
        const publicUsers = index.users.filter(u => u.community_opt_in === true);
        res.json({ users: publicUsers });
    } catch (err) {
        console.error('Error reading index:', err);
        res.status(500).json({ error: 'Failed to read users index' });
    }
});

// GET /api/admin/rebuild-index — Reconstruire l'index depuis les fichiers
app.get('/api/admin/rebuild-index', async (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
        const users = [];

        for (const file of files) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
                users.push({
                    username: data.username,
                    avatar_url: data.avatar_url || null,
                    community_opt_in: data.community_opt_in || false,
                    favorites_count: data.favorites_count || 0,
                    updated_at: data.updated_at || null
                });
            } catch (parseErr) {
                console.warn(`Skipping corrupted file: ${file}`, parseErr.message);
            }
        }

        await withIndexLock(() => {
            atomicWriteFile(INDEX_FILE, JSON.stringify({ users }, null, 2));
        });

        res.json({ success: true, count: users.length });
    } catch (err) {
        console.error('Error rebuilding index:', err);
        res.status(500).json({ error: 'Failed to rebuild index' });
    }
});

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🤘 RO Planner API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Data dir: ${DATA_DIR}`);
});
