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

    return (
        <>
            <header>
                <span className="header-title">Hellfest-RO</span>

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
