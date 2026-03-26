import React from 'react';

const PWAInstallModal = ({ isOpen, onClose, platform }) => {
    if (!isOpen) return null;

    const isIOS = platform === 'ios';

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '20px',
                padding: '30px',
                width: '100%',
                maxWidth: '400px',
                border: '1px solid #333',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                position: 'relative',
                color: 'white',
                textAlign: 'center'
            }} onClick={e => e.stopPropagation()}>
                
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        fontSize: '1.5rem',
                        cursor: 'pointer'
                    }}
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <div style={{
                    fontSize: '3rem',
                    color: '#00b894',
                    marginBottom: '20px'
                }}>
                    <i className="fa-solid fa-mobile-screen-button"></i>
                </div>

                <h2 style={{ 
                    fontFamily: 'Metal Mania, cursive', 
                    color: '#FFD700',
                    fontSize: '1.8rem',
                    marginBottom: '20px'
                }}>
                    INSTALLER L'APP
                </h2>

                <p style={{ fontSize: '1rem', lineHeight: '1.5', color: '#ccc', marginBottom: '25px' }}>
                    {isIOS 
                        ? "Pour une meilleure expérience (hors-ligne, plein écran), installez l'application sur votre iPhone." 
                        : "L'installation automatique n'est pas disponible. Suivez ces étapes pour installer l'application."}
                </p>

                <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                    {isIOS ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#333', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</div>
                                <span>Appuyez sur le bouton <strong>Partager</strong> <i className="fa-solid fa-arrow-up-from-bracket" style={{ color: '#007AFF' }}></i> en bas de Safari.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#333', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</div>
                                <span>Faites défiler et appuyez sur <strong>Sur l'écran d'accueil</strong> <i className="fa-solid fa-square-plus"></i>.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#333', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</div>
                                <span>Appuyez sur <strong>Ajouter</strong> en haut à droite.</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#333', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</div>
                                <span>Ouvrez le menu du navigateur <i className="fa-solid fa-ellipsis-vertical"></i> ou <i className="fa-solid fa-bars"></i>.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#333', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</div>
                                <span>Cherchez l'option <strong>Installer l'application</strong> ou <strong>Ajouter à l'écran d'accueil</strong>.</span>
                            </div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={onClose}
                    style={{
                        marginTop: '30px',
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#FFD700',
                        color: 'black',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    OK, J'AI COMPRIS !
                </button>
            </div>
        </div>
    );
};

export default PWAInstallModal;
