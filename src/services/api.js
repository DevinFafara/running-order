/**
 * Centralized API service for all backend calls.
 * All API interactions MUST go through this module.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/running-order/api';

/**
 * Generic response handler
 */
async function handleResponse(response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

export const api = {
    /**
     * Get a user's Running Order
     * @param {string} username
     * @returns {Promise<Object>} User data with favorites
     */
    getRO: (username) =>
        fetch(`${API_BASE}/ro/${encodeURIComponent(username)}`)
            .then(handleResponse),

    /**
     * Save a user's Running Order
     * @param {string} username
     * @param {Object} data - { avatar_url, favorites, community_opt_in, favorites_count }
     * @returns {Promise<Object>} { success: true, updated_at }
     */
    saveRO: (username, data) =>
        fetch(`${API_BASE}/ro/${encodeURIComponent(username)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(handleResponse),

    /**
     * Delete a user's Running Order and all associated data
     * @param {string} username
     * @returns {Promise<Object>} { success: true }
     */
    deleteRO: (username) =>
        fetch(`${API_BASE}/ro/${encodeURIComponent(username)}`, {
            method: 'DELETE'
        }).then(handleResponse),

    /**
     * Get list of community-visible users
     * @returns {Promise<Object>} { users: [...] }
     */
    getUsers: () =>
        fetch(`${API_BASE}/users`)
            .then(handleResponse),

    /**
     * Get VAPID public key for push subscription
     * @returns {Promise<Object>} { publicKey: string }
     */
    getPushVapidKey: () =>
        fetch(`${API_BASE}/push/vapid-public-key`)
            .then(handleResponse),

    /**
     * Register or update a push subscription with its alarms
     * @param {Object} subscription - { endpoint, keys }
     * @param {Array} alarms - list of alarm objects
     * @param {Object} settings - { notify5min, notify15min }
     */
    subscribePush: (subscription, alarms, settings) =>
        fetch(`${API_BASE}/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription, alarms, settings }),
        }).then(handleResponse),

    /**
     * Remove a push subscription
     * @param {string} endpoint
     */
    unsubscribePush: (endpoint) =>
        fetch(`${API_BASE}/push/unsubscribe`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint }),
        }).then(handleResponse),

    // ── Groups ──────────────────────────────────────────────────────────────

    getGroup: (code) =>
        fetch(`${API_BASE}/groups/${encodeURIComponent(code)}`)
            .then(handleResponse),

    createGroup: (data) =>
        fetch(`${API_BASE}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(handleResponse),

    joinGroup: (code, data) =>
        fetch(`${API_BASE}/groups/${encodeURIComponent(code)}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(handleResponse),

    leaveGroup: (code, memberId) =>
        fetch(`${API_BASE}/groups/${encodeURIComponent(code)}/leave`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId }),
        }).then(handleResponse),

    deleteGroup: (code, memberId) =>
        fetch(`${API_BASE}/groups/${encodeURIComponent(code)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId }),
        }).then(handleResponse),

    updatePosition: (memberId, position) =>
        fetch(`${API_BASE}/anon/position`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId, position }),
        }).then(handleResponse),
};
