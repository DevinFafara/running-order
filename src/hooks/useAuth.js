import { useState, useEffect } from 'react';

// ─── Mock users for development ─────────────────────────────────────────────
const MOCK_USERS = {
    alice: {
        username: 'alice',
        avatar_url: null // Will use initials fallback
    },
    bob: {
        username: 'bob',
        avatar_url: null
    },
    charlie: {
        username: 'charlie',
        avatar_url: null
    }
};

/**
 * Authentication hook — handles Discourse SSO in production
 * and returns mock users in development.
 *
 * In production, the SSO flow is:
 * 1. User clicks "Se connecter"
 * 2. Redirect to Discourse SSO endpoint
 * 3. Discourse redirects back with ?sso=...&sig=... in the URL
 * 4. This hook decodes the payload and extracts username + avatar
 * 5. Stores in sessionStorage for persistence across page navigations
 *
 * In development (import.meta.env.DEV):
 * - Reads VITE_MOCK_USER from .env.development
 * - Returns a mock user object (or null if 'guest')
 *
 * @returns {{ user: Object|null, isAuthenticated: boolean, isLoading: boolean, logout: Function }}
 */
export function useAuth() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // ─── Development mode: use mock user ────────────────────────
        if (import.meta.env.DEV) {
            const mockUserKey = import.meta.env.VITE_MOCK_USER || 'guest';

            if (mockUserKey === 'guest' || !MOCK_USERS[mockUserKey]) {
                setUser(null);
            } else {
                setUser(MOCK_USERS[mockUserKey]);
            }
            setIsLoading(false);
            return;
        }

        // ─── Production mode: check for SSO callback or session ─────
        try {
            // 1. Check if we're returning from a Discourse SSO redirect
            const params = new URLSearchParams(window.location.search);
            const sso = params.get('sso');
            const sig = params.get('sig');

            if (sso && sig) {
                // Decode the SSO payload
                // Note: In the old system, HMAC verification was done client-side.
                // In the new architecture, the backend middleware handles verification.
                // Here we just decode the payload that Discourse sends back.
                try {
                    const decodedSso = atob(decodeURIComponent(sso));
                    const userParams = new URLSearchParams(decodedSso);
                    const username = userParams.get('username');
                    const avatarUrl = userParams.get('avatar_url') || null;

                    if (username) {
                        const userData = { username, avatar_url: avatarUrl };
                        sessionStorage.setItem('ro_user', JSON.stringify(userData));
                        setUser(userData);
                    }
                } catch (decodeErr) {
                    console.error('Failed to decode SSO payload:', decodeErr);
                }

                // Clean the URL (remove sso/sig params)
                const cleanUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, cleanUrl);
            } else {
                // 2. Check for existing session
                const savedUser = sessionStorage.getItem('ro_user');
                if (savedUser) {
                    setUser(JSON.parse(savedUser));
                }
            }
        } catch (err) {
            console.error('Auth initialization error:', err);
        }

        setIsLoading(false);
    }, []);

    const logout = () => {
        sessionStorage.removeItem('ro_user');
        setUser(null);
    };

    return {
        user,
        isAuthenticated: !!user,
        isLoading,
        logout
    };
}
