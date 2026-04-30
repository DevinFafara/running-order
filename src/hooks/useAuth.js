import { useState, useEffect } from 'react';

const MOCK_USERS = {
    alice: { username: 'alice', avatar_url: null },
    bob: { username: 'bob', avatar_url: null },
    charlie: { username: 'charlie', avatar_url: null }
};

/**
 * Identifies the current user.
 *
 * Dev: reads VITE_MOCK_USER from .env.development ('alice', 'bob', 'charlie', or 'guest').
 * Prod: queries Discourse's native session endpoint (same domain, no redirect).
 *       If the user is logged in to the forum, their session cookie is present and
 *       /session/current.json returns their info automatically.
 */
export function useAuth() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (import.meta.env.DEV) {
            const mockUserKey = import.meta.env.VITE_MOCK_USER || 'guest';
            setUser(mockUserKey !== 'guest' && MOCK_USERS[mockUserKey] ? MOCK_USERS[mockUserKey] : null);
            setIsLoading(false);
            return;
        }

        // Production: query Discourse native session endpoint (no redirect, no crypto)
        fetch('/session/current.json', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                const current = data?.current_user;
                if (current?.username) {
                    setUser({
                        username: current.username,
                        avatar_url: current.avatar_template
                            ? current.avatar_template.replace('{size}', '64')
                            : null
                    });
                }
            })
            .catch(() => {
                // Not logged in or endpoint unreachable — stay anonymous
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    return { user, isAuthenticated: !!user, isLoading };
}
