import React, { useState, useEffect, useRef } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';

const GroupPopover = ({ group, position, onClose, onShowDetails }) => {
    const popoverRef = useRef(null);
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

    // Calculer la position du popover pour qu'il reste visible
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useEffect(() => {
        if (popoverRef.current) {
            const rect = popoverRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = position.x;
            let newY = position.y;

            // Ajuster horizontalement
            if (position.x + rect.width > viewportWidth - 20) {
                newX = position.x - rect.width - 20;
            }

            // Ajuster verticalement
            if (position.y + rect.height > viewportHeight - 20) {
                newY = viewportHeight - rect.height - 20;
            }
            if (newY < 60) newY = 60;

            setAdjustedPosition({ x: newX, y: newY });
        }
    }, [position]);

    // Fermer au clic en dehors
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={popoverRef}
            className="group-popover"
            style={{
                left: adjustedPosition.x,
                top: adjustedPosition.y,
                '--scene-color': sceneColor
            }}
        >
            {/* Header avec nom du groupe */}
            <div className="popover-header" style={{ backgroundColor: sceneColor }}>
                <h3>{group.GROUPE}</h3>
                <button className="popover-close" onClick={onClose}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            {/* Infos rapides */}
            <div className="popover-quick-info">
                <div className="popover-time">
                    <i className="fa-regular fa-clock"></i>
                    <span>{group.DEBUT.replace('h', ':')} - {group.FIN.replace('h', ':')}</span>
                </div>
                <div className="popover-scene">
                    <i className="fa-solid fa-location-dot"></i>
                    <span>{group.SCENE}</span>
                </div>
                {group.STYLE && (
                    <div className="popover-style">
                        <i className="fa-solid fa-music"></i>
                        <span>{group.STYLE}</span>
                    </div>
                )}
                {group.PAYS && (
                    <div className="popover-country">
                        <i className="fa-solid fa-globe"></i>
                        <span>{group.PAYS}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="popover-actions">
                <button
                    className={`popover-btn popover-btn-favorite ${isTagged ? 'active' : ''}`}
                    onClick={() => toggleBand(group.id)}
                    title={isTagged ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                    <i className={`fa-${isTagged ? 'solid' : 'regular'} fa-star`}></i>
                    <span>{isTagged ? 'Favori' : 'Ajouter'}</span>
                </button>

                <button
                    className="popover-btn popover-btn-details"
                    onClick={() => onShowDetails(group)}
                >
                    <i className="fa-solid fa-circle-info"></i>
                    <span>Plus d'infos</span>
                </button>
            </div>

            {/* Liens streaming (si disponibles) */}
            {(group.SPOTIFY || group.DEEZER || group.YOUTUBE) && (
                <div className="popover-streaming">
                    {group.SPOTIFY && (
                        <a href={group.SPOTIFY} target="_blank" rel="noopener noreferrer" title="Spotify" className="streaming-link spotify">
                            <i className="fa-brands fa-spotify"></i>
                        </a>
                    )}
                    {group.DEEZER && (
                        <a href={group.DEEZER} target="_blank" rel="noopener noreferrer" title="Deezer" className="streaming-link deezer">
                            <i className="fa-brands fa-deezer"></i>
                        </a>
                    )}
                    {group.YOUTUBE && (
                        <a href={group.YOUTUBE} target="_blank" rel="noopener noreferrer" title="YouTube" className="streaming-link youtube">
                            <i className="fa-brands fa-youtube"></i>
                        </a>
                    )}
                    {group.BANDCAMP && (
                        <a href={group.BANDCAMP} target="_blank" rel="noopener noreferrer" title="Bandcamp" className="streaming-link bandcamp">
                            <i className="fa-brands fa-bandcamp"></i>
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};

export default GroupPopover;
