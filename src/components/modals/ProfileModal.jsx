import React from 'react';

const ProfileModal = ({ isOpen, onClose, onOpenPanel, onShare, isInstallable, isInstalled, onInstall, hasPrompt, platform, onShowPwaGuide, isAuthenticated, username, onOpenGroups }) => {
    if (!isOpen) return null;

    const isForumInstance = !import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        window.location.hostname.includes('hellfest.fr');

    const MENU_ITEMS = [
        { id: 'stats', label: 'Mes Stats', icon: 'fa-solid fa-chart-pie', color: '#FFD700' },
        { id: 'contacts', label: 'Mes Contacts', icon: 'fa-solid fa-address-book', color: '#2196F3' },
        ...(isAuthenticated ? [{ id: 'community', label: 'Communauté', icon: 'fa-solid fa-users', color: '#FF6B35' }] : []),
        { id: 'share', label: 'Partager', icon: 'fa-solid fa-share-nodes', color: '#9C27B0' },
        { id: 'install', label: isInstalled ? 'Installée' : 'Installer', icon: 'fa-solid fa-download', color: isInstalled ? '#555' : '#00b894', disabled: isInstalled },
        { id: 'settings', label: 'Paramètres', icon: 'fa-solid fa-gear', color: '#aaa' },
        { id: 'playlists', label: 'Playlists', icon: 'fa-solid fa-music', color: '#1DB954' },
        { id: 'credits', label: 'Crédits', icon: 'fa-solid fa-heart', color: '#ff6b6b' },
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8  )',
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
                maxWidth: '350px',
                border: '1px solid #333',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

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

                <h2 style={{
                    marginTop: 0,
                    marginBottom: '20px',
                    color: '#FFD700',
                    textAlign: 'center',
                    fontFamily: '"Metal Mania", cursive', // Or app font
                    letterSpacing: '1px'
                }}>
                    MENU
                </h2>

                {isAuthenticated && username && (
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '15px',
                        fontSize: '0.85rem',
                        color: '#888'
                    }}>
                        <i className="fa-solid fa-user" style={{ marginRight: '6px', color: '#FFD700' }}></i>
                        {username}
                    </div>
                )}

                {!isAuthenticated && isForumInstance && (
                    <a
                        href="/login?return_path=/running-order/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '12px 16px',
                            backgroundColor: 'rgba(255, 215, 0, 0.08)',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            borderRadius: '12px',
                            color: '#FFD700',
                            textDecoration: 'none',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            marginBottom: '15px'
                        }}
                    >
                        <i className="fa-solid fa-right-to-bracket"></i>
                        Se connecter au forum
                    </a>
                )}

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px'
                }}>
                    {MENU_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'install') {
                                    if (!isInstalled) {
                                        if (hasPrompt) {
                                            onInstall();
                                        } else {
                                            if (onShowPwaGuide) onShowPwaGuide();
                                        }
                                    }
                                    onClose();
                                    return;
                                }
                                onClose();
                                if (item.id === 'share') {
                                    onShare();
                                } else if (item.id === 'groups') {
                                    onOpenGroups();
                                } else {
                                    onOpenPanel(item.id);
                                }
                            }}
                            disabled={item.disabled}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                padding: '15px',
                                backgroundColor: '#2a2a2a',
                                border: '1px solid #444',
                                borderRadius: '12px',
                                color: item.disabled ? '#444' : '#eee',
                                cursor: item.disabled ? 'default' : 'pointer',
                                transition: '0.2s',
                                opacity: item.disabled ? 0.6 : 1
                            }}
                        >
                            <div style={{
                                fontSize: '1.5rem',
                                color: item.color
                            }}>
                                <i className={item.icon}></i>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.label}</span>
                        </button>
                    ))}
                </div>

                <div style={{
                    textAlign: 'center',
                    marginTop: '20px',
                    fontSize: '0.8rem',
                    color: '#666'
                }}>
                    {(() => {
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const festivalStart = new Date(2026, 5, 18); // 18 Juin 2026
                        const festivalEnd = new Date(2026, 5, 21);   // 21 Juin 2026

                        if (today < festivalStart) {
                            const diffTime = festivalStart - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return `J - ${diffDays} avant l'Enfer`;
                        } else if (today <= festivalEnd) {
                            return "Bon Festival !";
                        } else {
                            return "See you next year !";
                        }
                    })()}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
