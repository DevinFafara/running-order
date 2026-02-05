import LZString from 'lz-string';

/**
 * Generates a compressed shareable link containing the user's running order.
 * @param {Object} taggedBands - The state.taggedBands object { id: { interest: 1|2|3, ... } }
 * @param {Array} customEvents - Array of custom event objects
 * @param {string} username - The user's nickname
 * @returns {string} The complete share URL
 */
export const generateShareLink = (taggedBands, customEvents, username = '') => {
    // 1. Minify Data
    // We only need the ID and the interest level for bands.
    const minimalBands = {};
    Object.entries(taggedBands).forEach(([id, data]) => {
        if (data.interest) {
            minimalBands[id] = data.interest;
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
    // Use hash query param strategy compatible with HashRouter if needed, 
    // but usually query string ?share=... works best.
    // If using HashRouter (#/), the search param usually comes AFTER the hash in some setups, or BEFORE.
    // React Router DOM v6 HashRouter: window.location.hash might contain the query.
    // Let's safe-bet on putting it in the search part of the hash: `#/current-route?share=...`

    const baseUrl = window.location.origin + window.location.pathname;
    // We want the user to land on the app.
    // If we simply append ?share=XYZ to root, it works.
    return `${baseUrl}?share=${compressed}#${window.location.hash.replace('#', '')}`;
};

/**
 * Parses a share token back into usable data.
 * @param {string} token - The compressed identifier from the URL
 * @returns {Object|null} The parsed data { bands: {}, customEvents: [] } or null if invalid
 */
export const parseShareData = (token) => {
    try {
        const decompressed = LZString.decompressFromEncodedURIComponent(token);
        if (!decompressed) return null;

        const data = JSON.parse(decompressed);

        if (!data || (!data.b && !data.c)) return null;

        // Reconstruct format
        const bands = {};
        if (data.b) {
            Object.entries(data.b).forEach(([id, interest]) => {
                bands[id] = { interest: interest }; // We reconstruct the full object structure
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
