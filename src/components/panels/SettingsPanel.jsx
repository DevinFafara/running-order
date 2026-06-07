import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { INTEREST_LEVELS, INTEREST_ORDER } from '../../constants';
import { api } from '../../services/api';

const SettingsPanel = ({ isOpen, onClose, onClearCustomEvents, onViewChange, notif, onOpenGroups }) => {
    const { state, setState, getInterestColor, setInterestColor, resetInterestColors, clearAllFavorites, consentChoice, setConsentChoice, reloadFromServer, user } = useCheckedState();
    const isAuthenticated = !!user;
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmServerDelete, setConfirmServerDelete] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [communityOptIn, setCommunityOptIn] = useState(consentChoice === 'full');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null); // null | 'applied' | 'empty' | 'error'

    const handleReloadFromServer = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const result = await reloadFromServer();
            if (result?.status === 'applied') {
                setSyncResult('applied');
                setTimeout(() => { setSyncResult(null); onClose(); }, 1800);
            } else if (result?.status === 'conflict') {
                onClose(); // ConflictResolver modal will appear automatically
            } else {
                setSyncResult('empty');
            }
        } catch {
            setSyncResult('error');
        } finally {
            setIsSyncing(false);
        }
    };

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

                {/* Section Notifications */}
                {notif && (
                    <div className="settings-section">
                        <h3>
                            <i className="fa-solid fa-bell" style={{ marginRight: '8px', color: '#FF6B35' }}></i>
                            Notifications
                        </h3>

                        {notif.isIOSBrowser ? (
                            <p className="settings-section-desc" style={{ color: '#aaa', lineHeight: '1.5' }}>
                                <i className="fa-solid fa-circle-info" style={{ marginRight: '6px', color: '#2196F3' }}></i>
                                Non disponible en navigation iOS. Installez l'app sur votre écran d'accueil (Safari → Partager → Sur l'écran d'accueil) pour activer les notifications.
                            </p>
                        ) : !notif.isSupported ? (
                            <p className="settings-section-desc" style={{ color: '#aaa' }}>
                                <i className="fa-solid fa-circle-info" style={{ marginRight: '6px', color: '#888' }}></i>
                                Non disponible sur ce navigateur.
                            </p>
                        ) : (
                            <>
                                <p className="settings-section-desc">
                                    Soyez alerté avant le début des concerts de vos favoris.
                                </p>

                                <label className="settings-option" style={{ cursor: notif.permission === 'denied' ? 'not-allowed' : 'pointer' }}>
                                    <div className="settings-option-info">
                                        <i className="fa-solid fa-bell" style={{ color: notif.enabled ? '#FF6B35' : '#666' }}></i>
                                        <div>
                                            <span className="settings-option-title">Activer les notifications</span>
                                            {notif.permission === 'denied' && (
                                                <span className="settings-option-desc" style={{ color: '#ff6b6b' }}>
                                                    Permission refusée — modifiez les réglages du navigateur
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notif.enabled}
                                            disabled={notif.permission === 'denied'}
                                            onChange={() => notif.enabled ? notif.disable() : notif.enable()}
                                        />
                                        <span className="toggle-slider"></span>
                                    </div>
                                </label>

                                {notif.enabled && (
                                    <>
                                        <label className="settings-option">
                                            <div className="settings-option-info">
                                                <i className="fa-solid fa-clock" style={{ color: '#888', fontSize: '0.9rem' }}></i>
                                                <div>
                                                    <span className="settings-option-title">15 min avant</span>
                                                </div>
                                            </div>
                                            <div className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={notif.notify15min}
                                                    onChange={(e) => notif.setNotify15min(e.target.checked)}
                                                />
                                                <span className="toggle-slider"></span>
                                            </div>
                                        </label>

                                        <label className="settings-option">
                                            <div className="settings-option-info">
                                                <i className="fa-solid fa-clock" style={{ color: '#888', fontSize: '0.9rem' }}></i>
                                                <div>
                                                    <span className="settings-option-title">5 min avant</span>
                                                </div>
                                            </div>
                                            <div className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={notif.notify5min}
                                                    onChange={(e) => notif.setNotify5min(e.target.checked)}
                                                />
                                                <span className="toggle-slider"></span>
                                            </div>
                                        </label>

                                        <p className="settings-section-desc" style={{ color: '#4CAF50', marginTop: '8px' }}>
                                            <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>
                                            Notifications actives — {Object.keys(state.taggedBands).length} groupe{Object.keys(state.taggedBands).length !== 1 ? 's' : ''} suivi{Object.keys(state.taggedBands).length !== 1 ? 's' : ''}
                                        </p>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Section Compte & Données (tous les users authentifiés) */}
                {isAuthenticated && (
                    <div className="settings-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '10px', paddingTop: '10px' }}>
                        <h3>
                            <i className="fa-solid fa-user-shield" style={{ marginRight: '8px', color: '#2196F3' }}></i>
                            Compte & Données
                        </h3>

                        {/* Sync inactive : proposer de récupérer depuis le serveur */}
                        {(!consentChoice || consentChoice === 'local_only') && (
                            <div>
                                <p className="settings-section-desc" style={{ color: '#aaa', lineHeight: '1.5', marginBottom: '12px' }}>
                                    <i className="fa-solid fa-circle-info" style={{ marginRight: '6px', color: '#888' }}></i>
                                    Votre RO est actuellement enregistré sur cet appareil uniquement. Pour récupérer votre sélection depuis un autre appareil, synchronisez avec le serveur.
                                </p>
                                <button
                                    className="settings-reset-btn"
                                    style={{
                                        width: '100%',
                                        backgroundColor: syncResult === 'applied' ? '#1a3a1a' : '#1a2a3a',
                                        border: `1px solid ${syncResult === 'applied' ? '#2e7d32' : '#1565C0'}`,
                                        color: syncResult === 'applied' ? '#81c784' : '#64b5f6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                    }}
                                    onClick={handleReloadFromServer}
                                    disabled={isSyncing || syncResult === 'applied'}
                                >
                                    {isSyncing
                                        ? <><i className="fa-solid fa-spinner fa-spin" /> Récupération en cours…</>
                                        : syncResult === 'applied'
                                            ? <><i className="fa-solid fa-circle-check" /> RO récupéré avec succès !</>
                                            : <><i className="fa-solid fa-cloud-arrow-down" /> Récupérer mon RO depuis le serveur</>
                                    }
                                </button>
                                {syncResult === 'empty' && (
                                    <p style={{ color: '#aaa', fontSize: '0.8em', marginTop: '6px', textAlign: 'center' }}>
                                        Aucun RO trouvé sur le serveur pour ce compte.
                                    </p>
                                )}
                                {syncResult === 'error' && (
                                    <p style={{ color: '#ff6b6b', fontSize: '0.8em', marginTop: '6px', textAlign: 'center' }}>
                                        Erreur de connexion. Réessayez dans un moment.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Sync active : options complètes */}
                        {consentChoice && consentChoice !== 'local_only' && (
                            <>
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
                                                try {
                                                    await api.saveRO(user.username, { community_opt_in: newValue });
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
                                        width: '100%', background: 'transparent', border: '1px solid #333',
                                        borderRadius: '8px', padding: '12px', marginTop: '10px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        textAlign: 'left', color: '#fff'
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
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid #333',
                                        borderRadius: '8px', padding: '15px', marginTop: '8px',
                                        fontSize: '0.8rem', color: '#aaa', lineHeight: '1.6'
                                    }}>
                                        <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#ccc' }}>Ce qui est stocké :</strong> Votre pseudo, avatar, sélection de groupes (favoris & contexte), créneaux personnalisés, et votre préférence de visibilité.</p>
                                        <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#ccc' }}>Où :</strong> Sur le serveur du forum Hellfest (même hébergement).</p>
                                        <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#ccc' }}>Qui y a accès :</strong> Les autres membres connectés (si vous l'avez accepté), et l'administrateur pour la maintenance.</p>
                                        <p style={{ margin: 0 }}><strong style={{ color: '#ccc' }}>Pas de tracking,</strong> pas de cookies tiers, pas de revente de données.</p>
                                    </div>
                                )}

                                <button
                                    className="settings-reset-btn"
                                    style={{
                                        width: '100%', marginTop: '10px',
                                        backgroundColor: syncResult === 'applied' ? '#1a3a1a' : 'transparent',
                                        border: `1px solid ${syncResult === 'applied' ? '#2e7d32' : '#333'}`,
                                        color: syncResult === 'applied' ? '#81c784' : '#aaa',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                    }}
                                    onClick={handleReloadFromServer}
                                    disabled={isSyncing || syncResult === 'applied'}
                                >
                                    {isSyncing
                                        ? <><i className="fa-solid fa-spinner fa-spin" /> Récupération…</>
                                        : syncResult === 'applied'
                                            ? <><i className="fa-solid fa-circle-check" /> RO récupéré !</>
                                            : <><i className="fa-solid fa-cloud-arrow-down" /> Récupérer depuis le serveur</>
                                    }
                                </button>
                                {syncResult === 'empty' && (
                                    <p style={{ color: '#aaa', fontSize: '0.8em', marginTop: '6px', textAlign: 'center' }}>
                                        Le serveur n'a pas de version plus récente.
                                    </p>
                                )}
                                {syncResult === 'error' && (
                                    <p style={{ color: '#ff6b6b', fontSize: '0.8em', marginTop: '6px', textAlign: 'center' }}>
                                        Erreur de connexion. Réessayez dans un moment.
                                    </p>
                                )}

                                <button
                                    className="settings-reset-btn danger"
                                    style={{
                                        width: '100%', marginTop: '12px',
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
                            </>
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

            </div>
        </div>
    );
};

export default SettingsPanel;
