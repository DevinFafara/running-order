import React, { useState } from 'react';

const PlaylistPanel = ({ isOpen, onClose }) => {
    const [hoveredItem, setHoveredItem] = useState(null);

    const playlists = [
        {
            id: 'spotify',
            name: 'Spotify',
            icon: 'fa-brands fa-spotify',
            color: '#1DB954',
            url: 'https://open.spotify.com/playlist/4VgcMpjJhRXOu8rysHfL9B?si=77ce0390ed004d5b'
        },
        {
            id: 'deezer',
            name: 'Deezer',
            icon: 'fa-brands fa-deezer',
            color: '#FF0092',
            url: 'https://www.deezer.com/fr/playlist/14540674743'
        },
        {
            id: 'apple',
            name: 'Apple Music',
            icon: 'fa-brands fa-apple',
            color: '#FA243C',
            url: 'https://music.apple.com/fr/playlist/hellfest-2026/pl.u-mJy81XRuz7KM1aJ?ls'
        },
        {
            id: 'youtube',
            name: 'YouTube Music',
            icon: 'fa-brands fa-youtube',
            color: '#FF0000',
            url: 'https://music.youtube.com/playlist?list=PLt9F-IhVs1eLTPzR2u4pcPzAOBGsjZh4a'
        }
    ];

    if (!isOpen) return null;

    return (
        <div className="panel-overlay" onClick={onClose}>
            <div className="playlist-panel" onClick={(e) => e.stopPropagation()}>
                <div className="panel-header">
                    <h2>
                        <i className="fa-solid fa-music"></i>
                        Playlists Hellfest 2026
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
                </div>

                <p className="panel-description">
                    Découvrez tous les artistes du festival sur votre plateforme préférée
                </p>

                <div className="playlist-grid">
                    {playlists.map((playlist) => (
                        <a
                            key={playlist.id}
                            href={playlist.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="playlist-card"
                            style={{
                                '--accent-color': playlist.color,
                                transform: hoveredItem === playlist.id ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onMouseEnter={() => setHoveredItem(playlist.id)}
                            onMouseLeave={() => setHoveredItem(null)}
                        >
                            <div className="playlist-icon" style={{ backgroundColor: playlist.color }}>
                                <i className={playlist.icon}></i>
                            </div>
                            <span className="playlist-name">{playlist.name}</span>
                            <i className="fa-solid fa-arrow-up-right-from-square playlist-external"></i>
                        </a>
                    ))}
                </div>

                <div className="panel-footer">
                    <i className="fa-solid fa-circle-info"></i>
                    Ces playlists sont mises à jour régulièrement par la communauté
                </div>
            </div>
        </div>
    );
};

export default PlaylistPanel;
