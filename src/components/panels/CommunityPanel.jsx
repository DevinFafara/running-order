import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { decodeROFromServer } from '../../utils/sharingUtils';

/**
 * CommunityPanel — Lists opt-in community members.
 * Clicking a user loads their RO in guest mode.
 */
const CommunityPanel = ({ isOpen, onClose, onViewUserRO, onSaveContact, currentUsername }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingUser, setLoadingUser] = useState(null);
    const [addingUser, setAddingUser] = useState(null);
    const [addedUsers, setAddedUsers] = useState([]);
    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('communityFavorites')) || [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        if (!isOpen) return;

        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.getUsers();
                // Filter out current user from the list
                const otherUsers = (data.users || []).filter(u => u.username !== currentUsername);
                setUsers(otherUsers);
            } catch (err) {
                console.error('Failed to load community:', err);
                setError('Impossible de charger la communauté');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [isOpen, currentUsername]);

    useEffect(() => {
        localStorage.setItem('communityFavorites', JSON.stringify(favorites));
    }, [favorites]);

    const handleUserClick = async (username) => {
        setLoadingUser(username);
        try {
            const userData = await api.getRO(username);
            if (userData && userData.favorites) {
                const decoded = decodeROFromServer(userData.favorites);
                if (decoded) {
                    onViewUserRO({
                        username: userData.username,
                        bands: decoded.taggedBands,
                        customEvents: decoded.customEvents,
                        bandCount: Object.keys(decoded.taggedBands).length,
                        eventCount: decoded.customEvents.length
                    });
                    onClose();
                }
            }
        } catch (err) {
            console.error(`Failed to load RO for ${username}:`, err);
        } finally {
            setLoadingUser(null);
        }
    };

    const handleAddContact = async (username, e) => {
        e.stopPropagation();
        setAddingUser(username);
        try {
            const userData = await api.getRO(username);
            if (userData && userData.favorites) {
                const decoded = decodeROFromServer(userData.favorites);
                if (decoded) {
                    onSaveContact({
                        username: userData.username,
                        bands: decoded.taggedBands,
                        customEvents: decoded.customEvents,
                        bandCount: Object.keys(decoded.taggedBands).length,
                        eventCount: decoded.customEvents.length
                    });
                    setAddedUsers(prev => [...prev, username]);
                }
            }
        } catch (err) {
            console.error(`Failed to add contact ${username}:`, err);
        } finally {
            setAddingUser(null);
        }
    };

    const toggleFavorite = (username, e) => {
        e.stopPropagation();
        setFavorites(prev =>
            prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '';
        }
    };

    const getInitials = (username) => {
        return username.slice(0, 2).toUpperCase();
    };

    if (!isOpen) return null;

    const sortedUsers = [...users].sort((a, b) => {
        const aFav = favorites.includes(a.username);
        const bFav = favorites.includes(b.username);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(3px)',
            animation: 'fadeIn 0.2s'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '16px',
                padding: '20px',
                width: '90%',
                maxWidth: '400px',
                border: '1px solid #333',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                position: 'relative',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>

                <h2 style={{
                    marginTop: 0,
                    marginBottom: '20px',
                    color: '#FFD700',
                    textAlign: 'center',
                    fontFamily: '"Metal Mania", cursive',
                    letterSpacing: '1px'
                }}>
                    <i className="fa-solid fa-users" style={{ marginRight: '10px', color: '#FF6B35' }}></i>
                    Communauté
                </h2>

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        padding: '5px'
                    }}
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '10px', display: 'block' }}></i>
                            Chargement...
                        </div>
                    )}

                    {error && (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#ff6b6b' }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                            {error}
                        </div>
                    )}

                    {!loading && !error && users.length === 0 && (
                        <p style={{ color: '#666', textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>
                            Aucun membre n'a encore partagé son RO.
                            <br />Soyez le premier ! 🤘
                        </p>
                    )}

                    {!loading && !error && users.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {sortedUsers.map(user => (
                                <div
                                    key={user.username}
                                    onClick={() => !loadingUser && handleUserClick(user.username)}
                                    style={{
                                        backgroundColor: '#2a2a2a',
                                        borderRadius: '10px',
                                        padding: '12px',
                                        border: '1px solid #444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: loadingUser === user.username ? 'wait' : 'pointer',
                                        transition: '0.2s',
                                        color: '#fff',
                                        opacity: loadingUser === user.username ? 0.6 : 1
                                    }}
                                >
                                    {/* Avatar */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: '#FF6B35',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem',
                                        flexShrink: 0,
                                        overflow: 'hidden'
                                    }}>
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.username}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            getInitials(user.username)
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                            {user.username}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '10px' }}>
                                            <span>{user.favorites_count || 0} groupes</span>
                                            {user.updated_at && (
                                                <span style={{ opacity: 0.8 }}>
                                                    · {formatDate(user.updated_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        {/* Favorite */}
                                        <button
                                            onClick={(e) => toggleFavorite(user.username, e)}
                                            title={favorites.includes(user.username) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                padding: '2px 4px',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                fontSize: '1rem',
                                                lineHeight: 1,
                                                color: favorites.includes(user.username) ? '#FFD700' : '#444'
                                            }}
                                        >
                                            <i className={favorites.includes(user.username) ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
                                        </button>

                                        {/* Add to contacts */}
                                        {onSaveContact && (
                                            <button
                                                onClick={(e) => handleAddContact(user.username, e)}
                                                disabled={addingUser === user.username || addedUsers.includes(user.username)}
                                                title={addedUsers.includes(user.username) ? 'Déjà ajouté' : 'Ajouter à mes contacts'}
                                                style={{
                                                    background: addedUsers.includes(user.username) ? 'rgba(76,175,80,0.2)' : 'rgba(255,215,0,0.15)',
                                                    border: `1px solid ${addedUsers.includes(user.username) ? '#4CAF50' : '#FFD700'}`,
                                                    borderRadius: '6px',
                                                    width: '28px',
                                                    height: '28px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: addedUsers.includes(user.username) ? 'default' : 'pointer',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {addingUser === user.username ? (
                                                    <i className="fa-solid fa-spinner fa-spin" style={{ color: '#FFD700', fontSize: '0.75rem' }}></i>
                                                ) : addedUsers.includes(user.username) ? (
                                                    <i className="fa-solid fa-check" style={{ color: '#4CAF50', fontSize: '0.75rem' }}></i>
                                                ) : (
                                                    <i className="fa-solid fa-user-plus" style={{ color: '#FFD700', fontSize: '0.75rem' }}></i>
                                                )}
                                            </button>
                                        )}

                                        {/* View arrow */}
                                        <div style={{ color: '#555', fontSize: '0.9rem', width: '16px', textAlign: 'center' }}>
                                            {loadingUser === user.username ? (
                                                <i className="fa-solid fa-spinner fa-spin"></i>
                                            ) : (
                                                <i className="fa-solid fa-chevron-right"></i>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunityPanel;
