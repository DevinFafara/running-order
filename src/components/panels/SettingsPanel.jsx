import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { INTEREST_LEVELS, INTEREST_ORDER } from '../../constants';
import { api } from '../../services/api';

const SettingsPanel = ({ isOpen, onClose, onClearCustomEvents, onViewChange }) => {
    const { state, setState, getInterestColor, setInterestColor, resetInterestColors, clearAllFavorites, consentChoice, setConsentChoice, user } = useCheckedState();
    const isAuthenticated = !!user;
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmServerDelete, setConfirmServerDelete] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [communityOptIn, setCommunityOptIn] = useState(consentChoice === 'full');

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

                {/* Section Compte & Données (uniquement si connecté) */}
                {isAuthenticated && consentChoice && consentChoice !== 'local_only' && (
                    <div className="settings-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '10px', paddingTop: '10px' }}>
                        <h3>
                            <i className="fa-solid fa-user-shield" style={{ marginRight: '8px', color: '#2196F3' }}></i>
                            Compte & Données
                        </h3>

                        <label className="settings-option">
                            <div className="settings-option-info">
                                <i className="fa-solid fa-users" style={{ color: '#FF6B35' }}></i>
                                <div>
                                    <span className="settings-option-title">Communauté</span>
                                    <span className="settings-option-desc">Rendre mon RO visible par les autres membres</span>
                                </div>
                            </div>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={communityOptIn}
                                    onChange={async (e) => {
                                        const newValue = e.target.checked;
                                        setCommunityOptIn(newValue);
                                        setConsentChoice(newValue ? 'full' : 'private');
                                        // Update on server
                                        try {
                                            await api.saveRO(user.username, {
                                                community_opt_in: newValue
                                            });
                                        } catch (err) {
                                            console.error('Failed to update community opt-in:', err);
                                        }
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </div>
                        </label>

                        <button
                            className="settings-option"
                            onClick={() => setShowPrivacy(!showPrivacy)}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                padding: '12px',
                                marginTop: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                textAlign: 'left',
                                color: '#fff'
                            }}
                        >
                            <div className="settings-option-info">
                                <i className="fa-solid fa-shield-halved" style={{ color: '#4CAF50' }}></i>
                                <div>
                                    <span className="settings-option-title">Informations sur les données</span>
                                    <span className="settings-option-desc">Ce qui est stocké et comment</span>
                                </div>
                            </div>
                            <i className={`fa-solid fa-chevron-${showPrivacy ? 'up' : 'down'}`} style={{ color: '#666', marginLeft: 'auto' }}></i>
                        </button>

                        {showPrivacy && (
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                padding: '15px',
                                marginTop: '8px',
                                fontSize: '0.8rem',
                                color: '#aaa',
                                lineHeight: '1.6'
                            }}>
                                <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#ccc' }}>Ce qui est stocké :</strong> Votre pseudo, avatar, sélection de groupes (favoris & contexte), créneaux personnalisés, et votre préférence de visibilité.</p>
                                <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#ccc' }}>Où :</strong> Sur le serveur du forum Hellfest (même hébergement).</p>
                                <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#ccc' }}>Qui y a accès :</strong> Les autres membres connectés (si vous l'avez accepté), et l'administrateur pour la maintenance.</p>
                                <p style={{ margin: 0 }}><strong style={{ color: '#ccc' }}>Pas de tracking,</strong> pas de cookies tiers, pas de revente de données.</p>
                            </div>
                        )}

                        <button
                            className="settings-reset-btn danger"
                            style={{
                                width: '100%',
                                marginTop: '12px',
                                backgroundColor: confirmServerDelete ? '#b91c1c' : 'rgba(220, 40, 41, 0.15)',
                                color: confirmServerDelete ? '#fff' : '#ff6b6b',
                                border: '1px solid rgba(220, 40, 41, 0.3)',
                                fontWeight: confirmServerDelete ? 'bold' : 'normal'
                            }}
                            onClick={async () => {
                                if (confirmServerDelete) {
                                    try {
                                        await api.deleteRO(user.username);
                                        setConsentChoice(null);
                                        localStorage.removeItem('ro_consent');
                                        setConfirmServerDelete(false);
                                        onClose();
                                    } catch (err) {
                                        console.error('Failed to delete server data:', err);
                                    }
                                } else {
                                    setConfirmServerDelete(true);
                                    setTimeout(() => setConfirmServerDelete(false), 4000);
                                }
                            }}
                        >
                            <i className={`fa-solid ${confirmServerDelete ? 'fa-triangle-exclamation' : 'fa-server'}`} style={{ marginRight: '8px' }}></i>
                            {confirmServerDelete ? 'CONFIRMER LA SUPPRESSION SERVEUR ?' : 'Supprimer mes données du serveur'}
                        </button>
                        {confirmServerDelete && (
                            <p style={{ color: '#ff6b6b', fontSize: '0.75em', marginTop: '5px', textAlign: 'center' }}>
                                Supprime votre fichier du serveur. Vos données locales sont conservées.
                            </p>
                        )}
                    </div>
                )}

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

                {/* Section Expérimentale */}
                <div className="settings-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '20px', paddingTop: '10px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#ffc800', opacity: 0.8 }}>
                        <i className="fa-solid fa-flask" style={{ marginRight: '8px' }}></i>
                        Fonctionnalités expérimentales
                    </h3>
                    <button
                        className="settings-option"
                        style={{
                            width: '100%',
                            background: 'rgba(255, 200, 0, 0.05)',
                            border: '1px dashed rgba(255, 200, 0, 0.2)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginTop: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            textAlign: 'left',
                            color: '#fff'
                        }}
                        onClick={() => {
                            onViewChange('map');
                            onClose();
                        }}
                    >
                        <div className="settings-option-info">
                            <i className="fa-solid fa-map-location-dot" style={{ color: '#ffc800' }}></i>
                            <div>
                                <span className="settings-option-title" style={{ color: '#ffc800' }}>Carte du site (Alpha)</span>
                                <span className="settings-option-desc">Afficher le plan interactif et les concerts en cours</span>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
