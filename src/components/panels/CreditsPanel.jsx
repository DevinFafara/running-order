import React from 'react';

const CreditsPanel = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="panel-overlay" onClick={onClose}>
            <div className="credits-panel" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                <div className="panel-header">
                    <h2 style={{ fontFamily: 'Metal Mania', letterSpacing: '2px' }}>
                        <i className="fa-solid fa-heart"></i>
                        Crédits
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

                <div className="credits-content">
                    <ul className="credits-list">
                        <li>
                            <span className="credit-label">Infos des groupes</span>
                            <span className="credit-value">J. Lucas & S. Papon</span>
                        </li>
                        <li>
                            <span className="credit-label">Artworks des scènes</span>
                            <span className="credit-value">Mush</span>
                        </li>
                        <li>
                            <span className="credit-label">Ce festival !!!</span>
                            <a
                                href="https://hellfest.fr"
                                target="_blank"
                                rel="noreferrer"
                                className="credit-link"
                            >
                                Hellfest Open Air
                            </a>
                        </li>
                        <li>
                            <span className="credit-label">La communauté</span>
                            <a
                                href="https://forum.hellfest.fr/"
                                target="_blank"
                                rel="noreferrer"
                                className="credit-link"
                            >
                                Hellfest Forum
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CreditsPanel;
