import React, { useState } from 'react';
import PlaylistPanel from '../panels/PlaylistPanel';
import FilterPanel from '../panels/FilterPanel';
import SettingsPanel from '../panels/SettingsPanel';
import CreditsPanel from '../panels/CreditsPanel';

const HeaderBar = () => {
    const [playlistOpen, setPlaylistOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [creditsOpen, setCreditsOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    React.useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <>
            <header>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="header-title">Hellfest-RO</span>
                    {!isOnline && (
                        <span
                            title="Mode Hors-ligne (Données en cache)"
                            style={{
                                color: '#e74c3c',
                                fontSize: '0.8rem',
                                animation: 'pulse 2s infinite'
                            }}
                        >
                            <i className="fa-solid fa-cloud-slash"></i>
                        </span>
                    )}
                </div>

                <div className="toolbar">
                    <button
                        className={`toolbar-btn ${filterOpen ? 'active' : ''}`}
                        title="Filtres"
                        onClick={() => setFilterOpen(true)}
                    >
                        <i className="fa-solid fa-filter"></i>
                    </button>
                    <button
                        className={`toolbar-btn ${playlistOpen ? 'active' : ''}`}
                        title="Playlists"
                        onClick={() => setPlaylistOpen(true)}
                    >
                        <i className="fa-solid fa-music"></i>
                    </button>
                    <button
                        className={`toolbar-btn ${settingsOpen ? 'active' : ''}`}
                        title="Paramètres"
                        onClick={() => setSettingsOpen(true)}
                    >
                        <i className="fa-solid fa-gear"></i>
                    </button>
                    <button
                        className={`toolbar-btn ${creditsOpen ? 'active' : ''}`}
                        title="Crédits"
                        onClick={() => setCreditsOpen(true)}
                    >
                        <i className="fa-solid fa-heart"></i>
                    </button>
                </div>
            </header>

            <FilterPanel
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
            />

            <PlaylistPanel
                isOpen={playlistOpen}
                onClose={() => setPlaylistOpen(false)}
            />

            <SettingsPanel
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />

            <CreditsPanel
                isOpen={creditsOpen}
                onClose={() => setCreditsOpen(false)}
            />
        </>
    );
};

export default HeaderBar;
