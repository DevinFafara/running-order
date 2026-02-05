import React, { useState } from 'react';
import PlaylistPanel from '../panels/PlaylistPanel';
import FilterPanel from '../panels/FilterPanel';
import SettingsPanel from '../panels/SettingsPanel';
import CreditsPanel from '../panels/CreditsPanel';
import ContactsPanel from '../panels/ContactsPanel';

import StatsPanel from '../panels/StatsPanel';

const HeaderBar = ({ viewMode, onViewChange, onInteraction, onAddCustomEvent, customEvents, contacts, onDeleteContact, onCheckContact }) => {
    const [playlistOpen, setPlaylistOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [creditsOpen, setCreditsOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [contactsOpen, setContactsOpen] = useState(false);

    return (
        <>
            <header>
                <div className="header-left">
                    <span className="header-title">Hellfest-RO</span>
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
                        className={`toolbar-btn ${statsOpen ? 'active' : ''}`}
                        title="Mes Stats"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setStatsOpen(true);
                        }}
                    >
                        <i className="fa-solid fa-chart-pie"></i>
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
                        className={`toolbar-btn ${playlistOpen ? 'active' : ''}`}
                        title="Playlists"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setPlaylistOpen(true);
                        }}
                    >
                        <i className="fa-solid fa-music"></i>
                    </button>
                    <button
                        className={`toolbar-btn ${settingsOpen ? 'active' : ''}`}
                        title="Paramètres"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setSettingsOpen(true);
                        }}
                    >
                        <i className="fa-solid fa-gear"></i>
                    </button>
                    <button
                        className={`toolbar-btn ${contactsOpen ? 'active' : ''}`}
                        title="Contacts"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setContactsOpen(true);
                        }}
                    >
                        <i className="fa-solid fa-address-book"></i>
                    </button>
                    <button
                        className={`toolbar-btn ${creditsOpen ? 'active' : ''}`}
                        title="Crédits"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setCreditsOpen(true);
                        }}
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
        </>
    );
};

export default HeaderBar;
