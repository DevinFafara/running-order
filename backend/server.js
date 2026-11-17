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
const ANON_DIR = path.join(__dirname, 'data', 'anon');
const GROUPS_DIR = path.join(__dirname, 'data', 'groups');
// URL de l'instance Discourse — doit être accessible depuis le container
const DISCOURSE_URL = process.env.DISCOURSE_URL || 'https://forum.hellfest.fr';

// ─── Push notifications (VAPID) ─────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || null;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || null;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://forum.hellfest.fr';
const pushEnabled = !!(webPush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

// ─── Ensure data directories exist ──────────────────────────────────────────
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(ANON_DIR, { recursive: true });
fs.mkdirSync(GROUPS_DIR, { recursive: true });
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

// Utilisateur Discourse de la requête (cookie de session `_t`), ou null si aucune session
async function getDiscourseUsername(req) {
    const sessionCookie = parseCookies(req.headers.cookie)['_t'];
    if (!sessionCookie) return null;
    const response = await fetch(`${DISCOURSE_URL}/session/current.json`, {
        headers: { 'Cookie': `_t=${sessionCookie}` }
    });
    const data = await response.json();
    return data?.current_user?.username || null;
}

async function verifyAuth(req, res, next) {
    if (process.env.NODE_ENV !== 'production') {
        req.authenticatedUser = req.params.username;
        return next();
    }

    try {
        const username = await getDiscourseUsername(req);
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

// ─── File lock (per-path mutex) ─────────────────────────────────────────────
const fileLocks = new Map();

function withFileLock(filePath, fn) {
    const prev = fileLocks.get(filePath) || Promise.resolve();
    let resolve, reject;
    const gate = new Promise((res, rej) => { resolve = res; reject = rej; });
    fileLocks.set(filePath, gate);
    return prev.then(() => {
        try { const r = fn(); resolve(); return r; }
        catch (err) { reject(err); throw err; }
    }).catch(err => { reject(err); throw err; });
}

// ─── Group code generator ────────────────────────────────────────────────────
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateGroupCode() {
    let code = '';
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    code += '-';
    for (let i = 0; i < 4; i++) code += Math.floor(Math.random() * 10);
    return code;
}

// ─── In-memory rate limiter (group creation) ─────────────────────────────────
const rateLimitMap = new Map();

function checkRateLimit(ip, max = 5, windowMs = 3600000) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
        return true;
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
}

// ─── Input sanitizers ────────────────────────────────────────────────────────
function sanitizeCode(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9);
}

function sanitizeMemberId(raw) {
    return String(raw || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36);
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
        scheduledAt: '2027-06-03T21:00:00+02:00', 
        title: '🤘 J-14 — Plus que 2 semaines !',
        body: 'Le Hellfest approche. Fini de préparer ton Running Order ?' 
    },
    { 
        id: 'j-7',
        scheduledAt: '2027-06-10T18:00:00+02:00',
        title: '🔥 J-7 — Plus qu\'une semaine à tenir',
        body: 'Les bagages sont prêts ? N\'oublie pas la crème solaire 😎' 
    },
    { 
        id: 'j-1',
        scheduledAt: '2027-06-16T10:00:00+02:00',
        title: '🚗 J-1 — En voiture Simone',
        body: 'Prudence sur la route. Clisson peut attendre, on a besoin de toi en un seul morceau.'
    },
    { 
        id: 'd1',
        scheduledAt: '2027-06-17T12:00:00+02:00',
        title: '🎸 Jour 1 — Début des hostilités', 
        body: 'C\'est parti pour 4 jours, 10 scènes, + de 300 groupes. Et on n\'oublie pas les bouchons d\'oreilles'
    },
    {
        id: 'd2',
        scheduledAt: '2027-06-18T10:00:00+02:00',
        title: '🍔 Jour 2 — Conseil stratégique',
        body: 'Mange avant 11h ou après 15h. Les files d\'attente du food court aux heures des repas, c\'est comme un mosh pit, mais en moins fun.'
    },
    { 
        id: 'd3',
        scheduledAt: '2027-06-19T10:00:00+02:00', 
        title: '💧 Rappel hydratation — Jour 3', 
        body: 'Buvez de l\'eau. Pas que de la bière. (Bon ok, les deux. Mais de l\'eau quand même)' 
    },
    { 
        id: 'd4',
        scheduledAt: '2027-06-20T10:00:00+02:00',
        title: '🔥 Dernier jour — On donne tout',
        body: 'Aujourd\'hui ça se termine. Économise pas ton énergie — t\'auras toute l\'année pour récupérer.'
    },
    { 
        id: 'end',
        scheduledAt: '2027-06-21T12:00:00+02:00',
        title: '🥲 C\'est déjà fini',
        body: 'Merci d\'avoir utilisé cette application. See you in 2028 🤘'
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
app.get('/running-order/api/ro/:username', async (req, res) => {
    const username = sanitizeUsername(req.params.username);
    const filePath = path.join(DATA_DIR, `${username}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'User not found' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // RO privé : seul son propriétaire peut le lire (session Discourse vérifiée
        // seulement dans ce cas, pour ne pas appeler Discourse à chaque lecture publique).
        // In dev mode, we skip this check
        if (process.env.NODE_ENV === 'production' && !data.community_opt_in) {
            let requester = null;
            try {
                requester = await getDiscourseUsername(req);
            } catch (err) {
                console.error('Auth verification error:', err);
            }
            if (!requester || sanitizeUsername(requester) !== username) {
                return res.status(403).json({ error: 'This user\'s RO is private' });
            }
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

    // Lire les données existantes pour éviter d'écraser les champs absents du body
    let existingData = {};
    if (fs.existsSync(filePath)) {
        try { existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (e) {}
    }

    const userData = {
        username,
        avatar_url:              req.body.avatar_url              ?? existingData.avatar_url              ?? null,
        favorites:               req.body.favorites               || existingData.favorites               || '',
        contacts:                req.body.contacts                || existingData.contacts                || [],
        community_opt_in:        req.body.community_opt_in        ?? existingData.community_opt_in        ?? false,
        favorites_count:         req.body.favorites_count         ?? existingData.favorites_count         ?? 0,
        current_favorites_count: req.body.current_favorites_count ?? existingData.current_favorites_count ?? null,
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

// ═══════════════════════════════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════════════════════════════

// POST /running-order/api/groups — Créer un groupe
app.post('/running-order/api/groups', (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Trop de groupes créés. Réessaie dans une heure.' });
    }
    const { name, member_id, pseudo, username } = req.body;
    if (!name || !member_id || !pseudo) {
        return res.status(400).json({ error: 'Champs name, member_id et pseudo requis' });
    }
    const sanitizedName = String(name).trim().slice(0, 20);
    const sanitizedPseudo = String(pseudo).trim().slice(0, 15);
    const sanitizedMemberId = sanitizeMemberId(member_id);
    if (!sanitizedName || !sanitizedPseudo || !sanitizedMemberId) {
        return res.status(400).json({ error: 'Données invalides' });
    }
    let code, attempts = 0;
    do { code = generateGroupCode(); attempts++; }
    while (fs.existsSync(path.join(GROUPS_DIR, `${code}.json`)) && attempts < 10);

    const group = {
        code,
        name: sanitizedName,
        created_by: sanitizedMemberId,
        created_at: new Date().toISOString(),
        members: [{ member_id: sanitizedMemberId, pseudo: sanitizedPseudo, username: username || null }],
    };
    try {
        atomicWriteFile(path.join(GROUPS_DIR, `${code}.json`), JSON.stringify(group, null, 2));
        res.json({ success: true, code, name: sanitizedName });
    } catch (err) {
        console.error('Error creating group:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /running-order/api/groups/:code — Lire un groupe (membres + positions jointurées)
app.get('/running-order/api/groups/:code', (req, res) => {
    const code = sanitizeCode(req.params.code);
    const filePath = path.join(GROUPS_DIR, `${code}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Groupe introuvable' });
    try {
        const group = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const members = group.members.map(m => {
            const anonPath = path.join(ANON_DIR, `${m.member_id}.json`);
            let position = null, position_updated_at = null, position_comment = null, favorites = null, favorites_updated_at = null;
            if (fs.existsSync(anonPath)) {
                try {
                    const anon = JSON.parse(fs.readFileSync(anonPath, 'utf-8'));
                    position = anon.position || null;
                    position_updated_at = anon.position_updated_at || null;
                    position_comment = anon.position_comment || null;
                    favorites = anon.favorites || null;
                    favorites_updated_at = anon.favorites_updated_at || null;
                } catch {}
            }
            return { ...m, position, position_updated_at, position_comment, favorites, favorites_updated_at };
        });
        res.json({ ...group, members });
    } catch (err) {
        console.error('Error reading group:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /running-order/api/groups/:code/join — Rejoindre un groupe
app.post('/running-order/api/groups/:code/join', async (req, res) => {
    const code = sanitizeCode(req.params.code);
    const { member_id, pseudo, username } = req.body;
    if (!member_id || !pseudo) return res.status(400).json({ error: 'Champs member_id et pseudo requis' });
    const sanitizedMemberId = sanitizeMemberId(member_id);
    const sanitizedPseudo = String(pseudo).trim().slice(0, 15);
    const filePath = path.join(GROUPS_DIR, `${code}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Groupe introuvable' });
    let groupName;
    try {
        await withFileLock(filePath, () => {
            const group = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            groupName = group.name;
            if (group.members.some(m => m.member_id === sanitizedMemberId)) return;
            if (group.members.length >= 40) {
                const err = new Error('Ce groupe est complet (40 membres max)');
                err.status = 400;
                throw err;
            }
            group.members.push({ member_id: sanitizedMemberId, pseudo: sanitizedPseudo, username: username || null });
            atomicWriteFile(filePath, JSON.stringify(group, null, 2));
        });
        res.json({ success: true, name: groupName });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
    }
});

// DELETE /running-order/api/groups/:code — Supprimer un groupe (créateur uniquement)
app.delete('/running-order/api/groups/:code', (req, res) => {
    const code = sanitizeCode(req.params.code);
    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id requis' });
    const filePath = path.join(GROUPS_DIR, `${code}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Groupe introuvable' });
    try {
        const group = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (group.created_by !== sanitizeMemberId(member_id)) {
            return res.status(403).json({ error: 'Seul le créateur peut supprimer le groupe' });
        }
        fs.unlinkSync(filePath);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting group:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /running-order/api/groups/:code/members/:target_id — Exclure un membre (créateur uniquement)
app.delete('/running-order/api/groups/:code/members/:target_id', async (req, res) => {
    const code = sanitizeCode(req.params.code);
    const targetId = sanitizeMemberId(req.params.target_id);
    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id requis' });
    const requesterMemberId = sanitizeMemberId(member_id);
    if (requesterMemberId === targetId) return res.status(400).json({ error: 'Utilisez /leave pour quitter un groupe' });
    const filePath = path.join(GROUPS_DIR, `${code}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Groupe introuvable' });
    try {
        await withFileLock(filePath, () => {
            const group = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (group.created_by !== requesterMemberId) {
                const err = new Error('Seul le créateur peut exclure un membre');
                err.status = 403;
                throw err;
            }
            const before = group.members.length;
            group.members = group.members.filter(m => m.member_id !== targetId);
            if (group.members.length === before) return res.status(404).json({ error: 'Membre introuvable' });
            atomicWriteFile(filePath, JSON.stringify(group, null, 2));
        });
        res.json({ success: true });
    } catch (err) {
        if (err.status === 403) return res.status(403).json({ error: err.message });
        console.error('Error removing member:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /running-order/api/groups/:code/leave — Quitter un groupe
app.delete('/running-order/api/groups/:code/leave', async (req, res) => {
    const code = sanitizeCode(req.params.code);
    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id requis' });
    const sanitizedMemberId = sanitizeMemberId(member_id);
    const filePath = path.join(GROUPS_DIR, `${code}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Groupe introuvable' });
    try {
        await withFileLock(filePath, () => {
            const group = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            group.members = group.members.filter(m => m.member_id !== sanitizedMemberId);
            atomicWriteFile(filePath, JSON.stringify(group, null, 2));
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Error leaving group:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /running-order/api/anon/favorites — Partager ses favoris dans les groupes
app.put('/running-order/api/anon/favorites', async (req, res) => {
    const { member_id, favorites } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id requis' });
    const sanitizedMemberId = sanitizeMemberId(member_id);
    if (!sanitizedMemberId) return res.status(400).json({ error: 'member_id invalide' });
    if (favorites !== null && typeof favorites !== 'string') {
        return res.status(400).json({ error: 'favorites doit être une chaîne ou null' });
    }
    const filePath = path.join(ANON_DIR, `${sanitizedMemberId}.json`);
    try {
        await withFileLock(filePath, () => {
            let existing = {};
            if (fs.existsSync(filePath)) {
                try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
            }
            const data = {
                ...existing,
                member_id: sanitizedMemberId,
                favorites: favorites || null,
                favorites_updated_at: new Date().toISOString(),
            };
            atomicWriteFile(filePath, JSON.stringify(data, null, 2));
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating favorites:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /running-order/api/anon/position — Mettre à jour sa position et/ou son commentaire
app.put('/running-order/api/anon/position', async (req, res) => {
    const { member_id, position, comment } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id requis' });
    const sanitizedMemberId = sanitizeMemberId(member_id);
    if (!sanitizedMemberId) return res.status(400).json({ error: 'member_id invalide' });
    const filePath = path.join(ANON_DIR, `${sanitizedMemberId}.json`);
    try {
        await withFileLock(filePath, () => {
            let existing = {};
            if (fs.existsSync(filePath)) {
                try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
            }
            const data = { ...existing, member_id: sanitizedMemberId };
            if ('position' in req.body) {
                data.position = position || null;
                data.position_updated_at = new Date().toISOString();
            }
            if ('comment' in req.body) {
                data.position_comment = typeof comment === 'string' ? comment.slice(0, 50).trim() || null : null;
            }
            atomicWriteFile(filePath, JSON.stringify(data, null, 2));
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating position:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /running-order/api/admin/stats — Statistiques d'usage (comptes, crews, push), sans données personnelles
app.get('/running-order/api/admin/stats', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        if (!ADMIN_SECRET || req.query.secret !== ADMIN_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    const load = (dir) => {
        try {
            return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
                try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')); } catch { return null; }
            }).filter(Boolean);
        } catch { return []; }
    };
    const sum = (a) => a.reduce((s, x) => s + x, 0);
    const avg = (a) => (a.length ? Math.round((sum(a) / a.length) * 10) / 10 : 0);
    const byMonth = (arr, key) => arr.reduce((acc, x) => {
        const m = (x[key] || 'inconnu').slice(0, 7);
        acc[m] = (acc[m] || 0) + 1;
        return acc;
    }, {});

    const users = load(DATA_DIR), groups = load(GROUPS_DIR), anon = load(ANON_DIR), subs = load(SUBS_DIR);
    const fav = users.map(u => u.favorites_count || 0);
    const sizes = groups.map(g => (g.members || []).length);
    const alarms = subs.map(s => (s.alarms || []).length);

    res.json({
        users: {
            total: users.length,
            community_opt_in: users.filter(u => u.community_opt_in).length,
            with_favorites: fav.filter(n => n > 0).length,
            favorites_avg: avg(fav),
            favorites_max: Math.max(0, ...fav),
            favorites_total: sum(fav),
            with_contacts: users.filter(u => (u.contacts || []).length).length,
            contacts_total: sum(users.map(u => (u.contacts || []).length)),
            last_sync_by_month: byMonth(users, 'updated_at'),
        },
        crews: {
            total: groups.length,
            members_total: sum(sizes),
            members_avg: avg(sizes),
            members_max: Math.max(0, ...sizes),
            single_member: sizes.filter(n => n === 1).length,
            members_with_discourse_account: sum(groups.map(g => (g.members || []).filter(m => m.username).length)),
            created_by_month: byMonth(groups, 'created_at'),
        },
        anon_members: {
            total: anon.length,
            shared_position: anon.filter(a => a.position).length,
            shared_favorites: anon.filter(a => a.favorites).length,
        },
        push: {
            subscriptions: subs.length,
            with_alarms: alarms.filter(n => n > 0).length,
            alarms_total: sum(alarms),
            last_update_by_month: byMonth(subs, 'updated_at'),
        },
    });
});

// GET /running-order/api/admin/cleanup-groups — Retire anon/ et groups/ post-festival.
// Les fichiers ne sont pas supprimés : ils sont déplacés dans data/archive-<date>/ (récupérables sur le serveur).
app.get('/running-order/api/admin/cleanup-groups', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        if (!ADMIN_SECRET || req.query.secret !== ADMIN_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    const archiveDir = path.join(__dirname, 'data', `archive-${new Date().toISOString().slice(0, 10)}`);
    let moved = 0;
    const errors = [];
    for (const dir of [ANON_DIR, GROUPS_DIR]) {
        try {
            const target = path.join(archiveDir, path.basename(dir));
            fs.mkdirSync(target, { recursive: true });
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                try { fs.renameSync(path.join(dir, file), path.join(target, file)); moved++; }
                catch (e) { errors.push(file); }
            }
        } catch (e) { errors.push(`Erreur lecture ${dir}`); }
    }
    res.json({ success: true, moved, archive: path.basename(archiveDir), errors });
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
