import React, { useEffect, useRef } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';

const GroupModal = ({ group, onClose }) => {
    const modalRef = useRef(null);
    const { state, toggleBand } = useCheckedState();

    const isTagged = !!state.taggedBands[group.id];

    // Couleurs des scènes
    const sceneColors = {
        'MAINSTAGE 1': '#0055a5',
        'MAINSTAGE 2': '#a6a19b',
        'WARZONE': '#949b1a',
        'VALLEY': '#ce7c19',
        'ALTAR': '#dc2829',
        'TEMPLE': '#93a7b0',
    };

    const sceneColor = sceneColors[group.SCENE] || '#333';

    // Empêcher le scroll du body quand la modale est ouverte
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Fermer avec Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Liens sociaux
    const socialLinks = [
        { key: 'SITE', icon: 'fa-globe', label: 'Site officiel' },
        { key: 'FACEBOOK', icon: 'fa-facebook', label: 'Facebook', brand: true },
        { key: 'INSTAGRAM', icon: 'fa-instagram', label: 'Instagram', brand: true },
        { key: 'SETLISTFM', icon: 'fa-list', label: 'Setlist.fm' },
    ].filter(link => group[link.key]);

    // Liens streaming
    const streamingLinks = [
        { key: 'SPOTIFY', icon: 'fa-spotify', label: 'Spotify', color: '#1DB954' },
        { key: 'DEEZER', icon: 'fa-deezer', label: 'Deezer', color: '#FF0092' },
        { key: 'YOUTUBE', icon: 'fa-youtube', label: 'YouTube', color: '#FF0000' },
        { key: 'BANDCAMP', icon: 'fa-bandcamp', label: 'Bandcamp', color: '#629aa9' },
        { key: 'QOBUZ', icon: 'fa-headphones', label: 'Qobuz', color: '#4285f4' },
    ].filter(link => group[link.key]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                ref={modalRef}
                className="group-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header" style={{ backgroundColor: sceneColor }}>
                    <div className="modal-header-content">
                        <h2>{group.GROUPE}</h2>
                        <div className="modal-subtitle">
                            <span className="modal-scene">{group.SCENE}</span>
                            <span className="modal-day">{group.DAY}</span>
                            <span className="modal-time">{group.DEBUT.replace('h', ':')} - {group.FIN.replace('h', ':')}</span>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Corps de la modale */}
                <div className="modal-body">
                    {/* Infos principales */}
                    <div className="modal-info-grid">
                        {group.STYLE && (
                            <div className="modal-info-item">
                                <i className="fa-solid fa-music"></i>
                                <div>
                                    <span className="info-label">Style</span>
                                    <span className="info-value">{group.STYLE}</span>
                                </div>
                            </div>
                        )}
                        {group.PAYS && (
                            <div className="modal-info-item">
                                <i className="fa-solid fa-flag"></i>
                                <div>
                                    <span className="info-label">Pays</span>
                                    <span className="info-value">{group.PAYS}</span>
                                </div>
                            </div>
                        )}
                        {group.PARTICIPATIONS && (
                            <div className="modal-info-item">
                                <i className="fa-solid fa-fire"></i>
                                <div>
                                    <span className="info-label">Hellfest</span>
                                    <span className="info-value">{group.PARTICIPATIONS}</span>
                                </div>
                            </div>
                        )}
                        {group.FFO && (
                            <div className="modal-info-item modal-info-full">
                                <i className="fa-solid fa-heart"></i>
                                <div>
                                    <span className="info-label">Si vous aimez...</span>
                                    <span className="info-value">{group.FFO}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bio */}
                    {group.Bio && (
                        <div className="modal-bio">
                            <h4>
                                <i className="fa-solid fa-quote-left"></i>
                                Biographie
                            </h4>
                            <p>{group.Bio}</p>
                        </div>
                    )}

                    {/* Streaming */}
                    {streamingLinks.length > 0 && (
                        <div className="modal-streaming">
                            <h4>
                                <i className="fa-solid fa-headphones"></i>
                                Écouter
                            </h4>
                            <div className="streaming-buttons">
                                {streamingLinks.map(link => (
                                    <a
                                        key={link.key}
                                        href={group[link.key]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="streaming-button"
                                        style={{ '--btn-color': link.color }}
                                    >
                                        <i className={`fa-brands ${link.icon}`}></i>
                                        <span>{link.label}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Liens sociaux */}
                    {socialLinks.length > 0 && (
                        <div className="modal-social">
                            <h4>
                                <i className="fa-solid fa-link"></i>
                                Liens
                            </h4>
                            <div className="social-links">
                                {socialLinks.map(link => (
                                    <a
                                        key={link.key}
                                        href={group[link.key]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                    >
                                        <i className={`fa-${link.brand ? 'brands' : 'solid'} ${link.icon}`}></i>
                                        <span>{link.label}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer avec actions */}
                <div className="modal-footer">
                    <button
                        className={`modal-btn modal-btn-favorite ${isTagged ? 'active' : ''}`}
                        onClick={() => toggleBand(group.id)}
                    >
                        <i className={`fa-${isTagged ? 'solid' : 'regular'} fa-star`}></i>
                        <span>{isTagged ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
                    </button>
                    <button className="modal-btn modal-btn-close" onClick={onClose}>
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupModal;
