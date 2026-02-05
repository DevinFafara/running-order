import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { INTEREST_LEVELS, INTEREST_ORDER } from '../../constants';

const SettingsPanel = ({ isOpen, onClose, onClearCustomEvents }) => {
    const { state, setState, getInterestColor, setInterestColor, resetInterestColors, clearAllFavorites } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const canUseExtendedView = windowWidth >= 1200;

    const toggleCompact = () => {
        setState(prev => ({ ...prev, compact: !prev.compact }));
    };

    const toggleReverse = () => {
        setState(prev => ({ ...prev, reverse: !prev.reverse }));
    };

    const handleLanguageChange = (lang) => {
        setState(prev => ({ ...prev, language: lang }));
    };

    if (!isOpen) return null;

    return (
        <div className="panel-overlay" onClick={onClose}>
            <div className="settings-panel" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                <div className="panel-header">
                    <h2 style={{ fontFamily: 'Metal Mania', letterSpacing: '2px' }}>
                        <i className="fa-solid fa-gear"></i>
                        Paramètres
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

                {/* Section Couleurs des favoris */}
                <div className="settings-section">
                    <div className="settings-section-header">
                        <h3>Couleurs des favoris</h3>
                        <button className="settings-reset-btn" onClick={resetInterestColors}>
                            Réinitialiser
                        </button>
                    </div>
                    <p className="settings-section-desc">
                        Personnalisez les couleurs pour chaque niveau d'intérêt
                    </p>

                    <div className="color-options">
                        {INTEREST_ORDER.map(levelId => {
                            const level = INTEREST_LEVELS[levelId];
                            const currentColor = getInterestColor(levelId);

                            return (
                                <div key={levelId} className="color-option">
                                    <div className="color-option-info">
                                        <span
                                            className="color-preview-star"
                                            style={{ color: currentColor }}
                                        >
                                            ★
                                        </span>
                                        <span className="color-option-label">{level.label}</span>
                                    </div>
                                    <input
                                        type="color"
                                        value={currentColor}
                                        onChange={(e) => setInterestColor(levelId, e.target.value)}
                                        className="color-picker"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section Affichage */}
                <div className="settings-section">
                    <h3>Affichage</h3>

                    <label className="settings-option">
                        <div className="settings-option-info">
                            <i className="fa-solid fa-arrow-down-up-across-line"></i>
                            <div>
                                <span className="settings-option-title">Inverser l'ordre</span>
                                <span className="settings-option-desc">Matin en haut, soir en bas</span>
                            </div>
                        </div>
                        <div className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={state.reverse || false}
                                onChange={toggleReverse}
                            />
                            <span className="toggle-slider"></span>
                        </div>
                    </label>

                    {/* (Option Vue étendue déplacée dans DayView) */}


                </div>

                {/* Zone de danger */}
                <div className="settings-section">
                    <h3>Zone de danger</h3>
                    <button
                        className="settings-reset-btn danger"
                        style={{
                            width: '100%',
                            marginTop: '10px',
                            backgroundColor: confirmDelete ? '#b91c1c' : '#dc2829',
                            fontWeight: confirmDelete ? 'bold' : 'normal'
                        }}
                        onClick={() => {
                            if (confirmDelete) {
                                clearAllFavorites();
                                if (onClearCustomEvents) onClearCustomEvents();
                                onClose();
                                setConfirmDelete(false);
                            } else {
                                setConfirmDelete(true);
                                // Reset confirmation after 3 seconds if not clicked
                                setTimeout(() => setConfirmDelete(false), 3000);
                            }
                        }}
                    >
                        <i className={`fa-solid ${confirmDelete ? 'fa-triangle-exclamation' : 'fa-trash'}`} style={{ marginRight: '8px' }}></i>
                        {confirmDelete ? "CONFIRMER LA RÉINITIALISATION ?" : "Réinitialiser mon Running Order"}
                    </button>
                    {confirmDelete && (
                        <p style={{ color: '#ff6b6b', fontSize: '0.8em', marginTop: '5px', textAlign: 'center' }}>
                            Action irréversible : Efface tous les favoris et les créneaux personnalisés.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
