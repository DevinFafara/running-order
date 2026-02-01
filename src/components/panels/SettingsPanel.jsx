import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { INTEREST_LEVELS, INTEREST_ORDER } from '../../constants';

const SettingsPanel = ({ isOpen, onClose }) => {
    const { state, setState, getInterestColor, setInterestColor, resetInterestColors } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

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
            <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
                <div className="panel-header">
                    <h2>
                        <i className="fa-solid fa-gear"></i>
                        Paramètres
                    </h2>
                    <button className="panel-close" onClick={onClose}>
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

                    <label className={`settings-option ${!canUseExtendedView ? 'disabled' : ''}`}>
                        <div className="settings-option-info">
                            <i className="fa-solid fa-table-columns"></i>
                            <div>
                                <span className="settings-option-title">Vue étendue</span>
                                <span className="settings-option-desc">
                                    {canUseExtendedView
                                        ? 'Afficher chaque scène séparément'
                                        : 'Nécessite un écran ≥1200px'}
                                </span>
                            </div>
                        </div>
                        <div className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={!state.compact && canUseExtendedView}
                                onChange={toggleCompact}
                                disabled={!canUseExtendedView}
                            />
                            <span className="toggle-slider"></span>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
