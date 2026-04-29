/**
 * Centralized API service for all backend calls.
 * All API interactions MUST go through this module.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
};
