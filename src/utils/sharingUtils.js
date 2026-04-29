import LZString from 'lz-string';

/**
 * Generates a compressed shareable link containing the user's running order.
 * @param {Object} taggedBands - The state.taggedBands object { id: { interest, context, ... } }
 * @param {Array} customEvents - Array of custom event objects
 * @param {string} username - The user's nickname
 * @returns {string} The complete share URL
 */
export const generateShareLink = (taggedBands, customEvents, username = '') => {
    // 1. Minify Data — include both interest AND context
    const minimalBands = {};
    Object.entries(taggedBands).forEach(([id, data]) => {
        if (data.interest && data.context) {
            // Both interest and context → object format
            minimalBands[id] = { i: data.interest, c: data.context };
        } else if (data.interest) {
            // Interest only → string format (backward compatible with old links)
            minimalBands[id] = data.interest;
        } else if (data.context) {
            // Context only → object format
            minimalBands[id] = { c: data.context };
        }
    });

    // Simplify custom events
    const minimalEvents = customEvents.map(e => ({
        t: e.title,
        d: e.day,
        s: e.startTime,
        e: e.endTime,
        y: e.type
    }));

    const payload = {
        u: username,
        b: minimalBands,
        c: minimalEvents
    };

    // 2. Compress
    const jsonString = JSON.stringify(payload);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);

    // 3. Construct URL
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?share=${compressed}#${window.location.hash.replace('#', '')}`;
};

/**
 * Parses a share token back into usable data.
 * Handles both old format (interest only as string) and new format (object with interest + context).
 * @param {string} token - The compressed identifier from the URL
 * @returns {Object|null} The parsed data { bands: {}, customEvents: [] } or null if invalid
 */
export const parseShareData = (token) => {
    try {
        const decompressed = LZString.decompressFromEncodedURIComponent(token);
        if (!decompressed) return null;

        const data = JSON.parse(decompressed);

        if (!data || (!data.b && !data.c)) return null;

        // Reconstruct format — handle both old and new encoding
        const bands = {};
        if (data.b) {
            Object.entries(data.b).forEach(([id, val]) => {
                if (typeof val === 'string') {
                    // Old format: value is just the interest string (e.g. "must_see")
                    bands[id] = { interest: val };
                } else if (typeof val === 'object' && val !== null) {
                    // New format: value is { i: interest, c: context }
                    bands[id] = {
                        interest: val.i || null,
                        context: val.c || null
                    };
                }
            });
        }

        const events = [];
        if (data.c && Array.isArray(data.c)) {
            data.c.forEach(e => {
                events.push({
                    id: Date.now() + Math.random(), // Generate new unique IDs for import
                    title: e.t,
                    day: e.d,
                    startTime: e.s,
                    endTime: e.e,
                    type: e.y
                });
            });
        }

        return {
            username: data.u || 'Ami inconnu',
            bands,
            customEvents: events,
            bandCount: Object.keys(bands).length,
            eventCount: events.length
        };

    } catch (e) {
        console.error("Failed to parse share data", e);
        return null;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// Server-side storage helpers
// These use the same encoding format as share links, but without
// the username embedded (it's stored separately in the JSON file).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Encode taggedBands + customEvents into a compressed string for server storage.
 * @param {Object} taggedBands - The state.taggedBands object
 * @param {Array} customEvents - Array of custom event objects
 * @returns {string} LZString-compressed string
 */
export const encodeROForServer = (taggedBands, customEvents = []) => {
    const minimalBands = {};
    Object.entries(taggedBands).forEach(([id, data]) => {
        if (data.interest && data.context) {
            minimalBands[id] = { i: data.interest, c: data.context };
        } else if (data.interest) {
            minimalBands[id] = data.interest;
        } else if (data.context) {
            minimalBands[id] = { c: data.context };
        }
    });

    const minimalEvents = customEvents.map(e => ({
        t: e.title,
        d: e.day,
        s: e.startTime,
        e: e.endTime,
        y: e.type
    }));

    const payload = { b: minimalBands, c: minimalEvents };
    return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
};

/**
 * Decode a server-stored compressed string back into taggedBands + customEvents.
 * @param {string} encoded - LZString-compressed string from server
 * @returns {Object|null} { taggedBands: {}, customEvents: [] } or null if invalid
 */
export const decodeROFromServer = (encoded) => {
    try {
        if (!encoded) return null;

        const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
        if (!decompressed) return null;

        const data = JSON.parse(decompressed);
        if (!data) return null;

        const taggedBands = {};
        if (data.b) {
            Object.entries(data.b).forEach(([id, val]) => {
                if (typeof val === 'string') {
                    taggedBands[id] = { interest: val, taggedAt: Date.now() };
                } else if (typeof val === 'object' && val !== null) {
                    taggedBands[id] = {
                        interest: val.i || null,
                        context: val.c || null,
                        taggedAt: Date.now()
                    };
                }
            });
        }

        const customEvents = [];
        if (data.c && Array.isArray(data.c)) {
            data.c.forEach(e => {
                customEvents.push({
                    id: Date.now() + Math.random(),
                    title: e.t,
                    day: e.d,
                    startTime: e.s,
                    endTime: e.e,
                    type: e.y
                });
            });
        }

        return { taggedBands, customEvents };
    } catch (e) {
        console.error("Failed to decode server RO data", e);
        return null;
    }
};

/**
 * Encode contacts array for server storage.
 * Each contact's RO data (bands + customEvents) is re-encoded as a compact LZString.
 * @param {Array} contacts - Array of contact objects from App.jsx
 * @returns {Array} Compact contacts array for JSON storage
 */
export const encodeContacts = (contacts) => {
    if (!contacts || !Array.isArray(contacts)) return [];

    return contacts.map(contact => {
        const data = contact.data;
        if (!data) return null;

        return {
            username: contact.username,
            favorites: encodeROForServer(data.bands || {}, data.customEvents || []),
            importedAt: contact.importedAt || null
        };
    }).filter(Boolean);
};

/**
 * Decode server-stored contacts back into the format used by App.jsx.
 * @param {Array} serverContacts - Compact contacts from server JSON
 * @returns {Array} Full contact objects for App.jsx state
 */
export const decodeContacts = (serverContacts) => {
    if (!serverContacts || !Array.isArray(serverContacts)) return [];

    return serverContacts.map(sc => {
        const decoded = decodeROFromServer(sc.favorites);
        if (!decoded) return null;

        return {
            id: Date.now() + Math.random(),
            username: sc.username,
            data: {
                username: sc.username,
                bands: decoded.taggedBands,
                customEvents: decoded.customEvents,
                bandCount: Object.keys(decoded.taggedBands).length,
                eventCount: decoded.customEvents.length
            },
            importedAt: sc.importedAt || null
        };
    }).filter(Boolean);
};
