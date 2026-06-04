const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// web-push est optionnel — si non installé ou clés VAPID absentes, le push est simplement désactivé
let webPush = null;
try { webPush = require('web-push'); } catch (e) { /* non installé */ }

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;
const DATA_DIR = path.join(__dirname, 'data', 'users');
const INDEX_FILE = path.join(__dirname, 'data', 'index.json');
const SUBS_DIR = path.join(__dirname, 'data', 'subscriptions');
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, 'public');
// URL de l'instance Discourse — doit être accessible depuis le container
const DISCOURSE_URL = process.env.DISCOURSE_URL || 'https://forum.hellfest.fr';

// ─── Push notifications (VAPID) ─────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || null;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || null;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://forum.hellfest.fr';
const pushEnabled = !!(webPush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

// ─── Ensure data directories exist ──────────────────────────────────────────
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(INDEX_FILE)) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify({ users: [] }, null, 2));
}
if (pushEnabled) {
    fs.mkdirSync(SUBS_DIR, { recursive: true });
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// CORS: en dev, autoriser le frontend Vite (localhost:5173)
if (process.env.NODE_ENV !== 'production') {
    app.use(cors({ origin: true, credentials: true }));
} else {
    // En production, l'API est sur le même domaine — pas besoin de CORS
}

// Servir le frontend buildé (dist/) depuis backend/public/
if (fs.existsSync(STATIC_DIR)) {
    app.use('/running-order', express.static(STATIC_DIR));
}

// ─── Auth Middleware ────────────────────────────────────────────────────────

function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    return Object.fromEntries(
        cookieHeader.split(';').map(c => {
            const [k, ...v] = c.trim().split('=');
            return [k.trim(), v.join('=')];
        })
    );
}

async function verifyAuth(req, res, next) {
    if (process.env.NODE_ENV !== 'production') {
        req.authenticatedUser = req.params.username;
        return next();
    }

    const cookies = parseCookies(req.headers.cookie);
    const sessionCookie = cookies['_t'];
    if (!sessionCookie) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const response = await fetch(`${DISCOURSE_URL}/session/current.json`, {
            headers: { 'Cookie': `_t=${sessionCookie}` }
        });
        const data = await response.json();
        const username = data?.current_user?.username;
        if (!username) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        if (username !== req.params.username) {
            return res.status(403).json({ error: 'Interdit' });
        }
        req.authenticatedUser = username;
        next();
    } catch (err) {
        console.error('Auth verification error:', err);
        return res.status(500).json({ error: 'Erreur de vérification de session' });
    }
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
            current_favorites_count: userData.current_favorites_count ?? null,
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
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Subscription file helpers ──────────────────────────────────────────────
function endpointHash(endpoint) {
    return crypto.createHash('sha256').update(endpoint).digest('hex').substring(0, 16);
}

function getSubPath(endpoint) {
    return path.join(SUBS_DIR, `${endpointHash(endpoint)}.json`);
}

function writeSubscription(data) {
    atomicWriteFile(getSubPath(data.endpoint), JSON.stringify(data, null, 2));
}

function deleteSubscription(endpoint) {
    const filePath = getSubPath(endpoint);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
}

// ─── In-memory alarm queue ──────────────────────────────────────────────────
// Each entry: { endpoint, keys, bandName, scene, debut, label, notifyAt (ms) }
let alarmQueue = [];
const sentBroadcasts = new Set();

function buildAlarmQueue() {
    if (!pushEnabled) return;
    alarmQueue = [];
    const now = Date.now();
    try {
        const files = fs.readdirSync(SUBS_DIR).filter(f => f.endsWith('.json'));
        for (const file of files) {
            try {
                const sub = JSON.parse(fs.readFileSync(path.join(SUBS_DIR, file), 'utf-8'));
                if (!sub.endpoint || !sub.keys || !Array.isArray(sub.alarms)) continue;
                for (const alarm of sub.alarms) {
                    const notifyAt = new Date(alarm.notifyAt).getTime();
                    if (notifyAt > now) {
                        alarmQueue.push({
                            endpoint: sub.endpoint,
                            keys: sub.keys,
                            bandName: alarm.bandName,
                            scene: alarm.scene,
                            debut: alarm.debut,
                            label: alarm.label,
                            notifyAt,
                        });
                    }
                }
            } catch (e) { /* fichier corrompu, on ignore */ }
        }
        alarmQueue.sort((a, b) => a.notifyAt - b.notifyAt);
        console.log(`   Push queue: ${alarmQueue.length} alarmes chargées`);
    } catch (e) {
        console.error('Erreur construction queue:', e);
    }
}

// ─── Push sender ────────────────────────────────────────────────────────────
async function sendPush(endpoint, keys, payload) {
    try {
        await webPush.sendNotification({ endpoint, keys }, JSON.stringify(payload));
        return true;
    } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription révoquée par le navigateur
            deleteSubscription(endpoint);
            alarmQueue = alarmQueue.filter(a => a.endpoint !== endpoint);
        }
        return false;
    }
}

// ─── Broadcast notifications éditoriales ────────────────────────────────────
// scheduledAt en heure locale Paris (UTC+2 en été)
const BROADCAST_NOTIFICATIONS = [
    // Avant le festival
    { 
        id: 'j-14',
        scheduledAt: '2026-06-04T21:00:00+02:00', 
        title: '🤘 J-14 — Plus que 2 semaines !',
        body: 'Le Hellfest approche. Fini de préparer ton Running Order ?' 
    },
    { 
        id: 'j-7',
        scheduledAt: '2026-06-11T18:00:00+02:00',
        title: '🔥 J-7 — Plus qu\'une semaine à tenir',
        body: 'Les bagages sont prêts ? N\'oublie pas la crème solaire 😎' 
    },
    { 
        id: 'j-1',
        scheduledAt: '2026-06-17T10:00:00+02:00',
        title: '🚗 J-1 — En voiture Simone',
        body: 'Prudence sur la route. Clisson peut attendre, on a besoin de toi en un seul morceau.'
    },
    { 
        id: 'd1',
        scheduledAt: '2026-06-18T12:00:00+02:00',
        title: '🎸 Jour 1 — Début des hostilités', 
        body: 'C\'est parti pour 4 jours, 10 scènes, + de 200 groupes. Et on n\'oublie pas les bouchons d\'oreilles'
    },
    {
        id: 'd2',
        scheduledAt: '2026-06-19T10:00:00+02:00',
        title: '🍔 Jour 2 — Conseil stratégique',
        body: 'Mange avant 11h ou après 15h. Les files d\'attente du food court aux heures des repas, c\'est comme un mosh pit, mais en moins fun.'
    },
    { 
        id: 'd3',
        scheduledAt: '2026-06-20T10:00:00+02:00', 
        title: '💧 Rappel hydratation — Jour 3', 
        body: 'Buvez de l\'eau. Pas que de la bière. (Bon ok, les deux. Mais de l\'eau quand même)' 
    },
    { 
        id: 'd4',
        scheduledAt: '2026-06-21T10:00:00+02:00',
        title: '🔥 Dernier jour — On donne tout',
        body: 'Aujourd\'hui ça se termine. Économise pas ton énergie — t\'auras toute l\'année pour récupérer.'
    },
    { 
        id: 'end',
        scheduledAt: '2026-06-22T12:00:00+02:00',
        title: '🥲 C\'est déjà fini',
        body: 'Merci d\'avoir utilisé cette application. See you in 2027 🤘'
    },
];

// ─── Scheduler (toutes les 30s) ─────────────────────────────────────────────
if (pushEnabled) {
    buildAlarmQueue();

    setInterval(async () => {
        const now = Date.now();
        const BUFFER = 5000; // 5s de tolérance

        // Alarmes individuelles
        const due = alarmQueue.filter(a => a.notifyAt <= now + BUFFER);
        for (const alarm of due) {
            const minutes = alarm.label === '15min' ? '15' : '5';
            await sendPush(alarm.endpoint, alarm.keys, {
                title: `🎸 ${alarm.bandName} dans ${minutes} min`,
                body: `${alarm.scene} — ${alarm.debut}`,
                icon: '/running-order/icons/icon-192x192.png',
                badge: '/running-order/icons/icon-72x72.png',
                tag: `band-${endpointHash(alarm.endpoint)}-${alarm.label}-${alarm.bandName}`,
                url: '/running-order/',
            });
        }
        alarmQueue = alarmQueue.filter(a => a.notifyAt > now + BUFFER);

        // Broadcasts éditoriaux
        for (const bc of BROADCAST_NOTIFICATIONS) {
            if (sentBroadcasts.has(bc.id)) continue;
            const bcTime = new Date(bc.scheduledAt).getTime();
            if (bcTime <= now + BUFFER && bcTime > now - 35000) {
                sentBroadcasts.add(bc.id);
                try {
                    const files = fs.readdirSync(SUBS_DIR).filter(f => f.endsWith('.json'));
                    for (const file of files) {
                        try {
                            const sub = JSON.parse(fs.readFileSync(path.join(SUBS_DIR, file), 'utf-8'));
                            if (sub.endpoint && sub.keys) {
                                await sendPush(sub.endpoint, sub.keys, {
                                    title: bc.title,
                                    body: bc.body,
                                    icon: '/running-order/icons/icon-192x192.png',
                                    badge: '/running-order/icons/icon-72x72.png',
                                    tag: `broadcast-${bc.id}`,
                                    url: '/running-order/',
                                });
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
            }
        }
    }, 30000);
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /running-order/api/ro/:username — Lire le RO d'un utilisateur
app.get('/running-order/api/ro/:username', (req, res) => {
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

// POST /running-order/api/ro/:username — Sauvegarder le RO d'un utilisateur (auth requise)
app.post('/running-order/api/ro/:username', verifyAuth, async (req, res) => {
    const username = sanitizeUsername(req.params.username);

    if (req.authenticatedUser !== username) {
        return res.status(403).json({ error: 'You can only save your own RO' });
    }

    const filePath = path.join(DATA_DIR, `${username}.json`);

    const userData = {
        username,
        avatar_url: req.body.avatar_url || null,
        favorites: req.body.favorites || '',
        contacts: req.body.contacts || [],
        community_opt_in: req.body.community_opt_in ?? false,
        favorites_count: req.body.favorites_count ?? 0,
        current_favorites_count: req.body.current_favorites_count ?? null,
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

// DELETE /running-order/api/ro/:username — Supprimer le RO d'un utilisateur (auth requise)
app.delete('/running-order/api/ro/:username', verifyAuth, async (req, res) => {
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

// GET /running-order/api/users — Lister les utilisateurs opt-in (lecture de l'index)
app.get('/running-order/api/users', (req, res) => {
    try {
        const index = readIndex();
        const publicUsers = index.users.filter(u => u.community_opt_in === true);
        res.json({ users: publicUsers });
    } catch (err) {
        console.error('Error reading index:', err);
        res.status(500).json({ error: 'Failed to read users index' });
    }
});

// GET /running-order/api/admin/rebuild-index — Reconstruire l'index depuis les fichiers
app.get('/running-order/api/admin/rebuild-index', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        if (!ADMIN_SECRET || req.query.secret !== ADMIN_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
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

// ─── Push routes ────────────────────────────────────────────────────────────

// GET /running-order/api/push/vapid-public-key
app.get('/running-order/api/push/vapid-public-key', (req, res) => {
    if (!pushEnabled) return res.status(503).json({ error: 'Push non configuré' });
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /running-order/api/push/subscribe
app.post('/running-order/api/push/subscribe', (req, res) => {
    if (!pushEnabled) return res.status(503).json({ error: 'Push non configuré' });

    const { subscription, alarms, settings } = req.body;
    if (!subscription?.endpoint || !subscription?.keys) {
        return res.status(400).json({ error: 'Subscription invalide' });
    }

    const data = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        alarms: Array.isArray(alarms) ? alarms : [],
        settings: settings || { notify5min: true, notify15min: true },
        updated_at: new Date().toISOString(),
    };

    try {
        writeSubscription(data);
    } catch (err) {
        console.error('Erreur écriture subscription:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }

    // Mettre à jour la queue en mémoire
    const now = Date.now();
    alarmQueue = alarmQueue.filter(a => a.endpoint !== data.endpoint);
    for (const alarm of data.alarms) {
        const notifyAt = new Date(alarm.notifyAt).getTime();
        if (notifyAt > now) {
            alarmQueue.push({
                endpoint: data.endpoint,
                keys: data.keys,
                bandName: alarm.bandName,
                scene: alarm.scene,
                debut: alarm.debut,
                label: alarm.label,
                notifyAt,
            });
        }
    }
    alarmQueue.sort((a, b) => a.notifyAt - b.notifyAt);

    res.json({ success: true, alarmCount: data.alarms.length });
});

// DELETE /running-order/api/push/unsubscribe
app.delete('/running-order/api/push/unsubscribe', (req, res) => {
    if (!pushEnabled) return res.status(503).json({ error: 'Push non configuré' });

    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint manquant' });

    deleteSubscription(endpoint);
    alarmQueue = alarmQueue.filter(a => a.endpoint !== endpoint);

    res.json({ success: true });
});

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/running-order/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── SPA fallback ───────────────────────────────────────────────────────────
// Toutes les routes /running-order/* non matchées par l'API servent index.html
if (fs.existsSync(STATIC_DIR)) {
    app.get('/running-order/*', (req, res) => {
        res.sendFile(path.join(STATIC_DIR, 'index.html'));
    });
}

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🤘 RO Planner API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Data dir: ${DATA_DIR}`);
    console.log(`   Push notifications: ${pushEnabled ? 'activées' : 'désactivées (VAPID keys manquantes)'}`);
});
