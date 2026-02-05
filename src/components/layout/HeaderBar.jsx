import React, { useState } from 'react';
import PlaylistPanel from '../panels/PlaylistPanel';
import FilterPanel from '../panels/FilterPanel';
import SettingsPanel from '../panels/SettingsPanel';
import CreditsPanel from '../panels/CreditsPanel';
import ContactsPanel from '../panels/ContactsPanel';
import ProfileModal from '../modals/ProfileModal';
import ShareModal from '../modals/ShareModal';
import { useCheckedState } from '../../context/CheckedStateContext';

import StatsPanel from '../panels/StatsPanel';

const HeaderBar = ({ viewMode, onViewChange, onInteraction, onAddCustomEvent, customEvents, contacts, onDeleteContact, onCheckContact, isGuestMode, guestName, onExitGuestMode, onClearCustomEvents }) => {
    const { userState } = useCheckedState();
    const [playlistOpen, setPlaylistOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [creditsOpen, setCreditsOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [contactsOpen, setContactsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
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

    const handleOpenPanel = (id) => {
        if (id === 'stats') setStatsOpen(true);
        if (id === 'playlists') setPlaylistOpen(true);
        if (id === 'contacts') setContactsOpen(true);
        if (id === 'settings') setSettingsOpen(true);
        if (id === 'credits') setCreditsOpen(true);
        // Share handled separately via callback
    };

    return (
        <>
            <header>
                <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    {isGuestMode && (
                        <div style={{
                            fontSize: '0.8rem',
                            color: '#FFD700',
                            marginLeft: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <i className="fa-solid fa-eye"></i>
                            <span>{guestName}</span>
                            <button
                                onClick={onExitGuestMode}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                <div className="toolbar">
                    <button
                        className="toolbar-btn"
                        title="Ajouter un créneau perso"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            onAddCustomEvent();
                        }}
                    >
                        <i className="fa-solid fa-calendar-plus"></i>
                    </button>

                    <button
                        className={`toolbar-btn ${filterOpen ? 'active' : ''}`}
                        title="Filtres"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setFilterOpen(true);
                        }}
                    >
                        <i className="fa-solid fa-filter"></i>
                    </button>

                    <button
                        className={`toolbar-btn ${viewMode === 'week' ? 'active' : ''}`}
                        title={viewMode === 'week' ? "Vue Journalière" : "Vue Semaine"}
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            onViewChange(viewMode === 'week' ? 'day' : 'week');
                        }}
                    >
                        <i className={`fa-solid ${viewMode === 'week' ? 'fa-calendar-day' : 'fa-calendar-week'}`}></i>
                    </button>

                    <button
                        className={`toolbar-btn ${profileOpen ? 'active' : ''}`}
                        title="Menu Profil"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setProfileOpen(true);
                        }}
                        style={{ marginLeft: '5px' }}
                    >
                        <i className="fa-solid fa-bars"></i>
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
                onClearCustomEvents={onClearCustomEvents}
            />

            <CreditsPanel
                isOpen={creditsOpen}
                onClose={() => setCreditsOpen(false)}
            />

            <ContactsPanel
                isOpen={contactsOpen}
                onClose={() => setContactsOpen(false)}
                contacts={contacts}
                onDeleteContact={onDeleteContact}
                onCheckContact={onCheckContact}
            />

            {statsOpen && (
                <StatsPanel
                    onClose={() => setStatsOpen(false)}
                    customEvents={customEvents}
                />
            )}

            <ProfileModal
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                onOpenPanel={handleOpenPanel}
                onShare={() => setShareOpen(true)}
            />

            <ShareModal
                isOpen={shareOpen}
                onClose={() => setShareOpen(false)}
                taggedBands={userState ? userState.taggedBands : {}} // Using userState from context
                customEvents={customEvents}
            />
        </>
    );
};

export default HeaderBar;
