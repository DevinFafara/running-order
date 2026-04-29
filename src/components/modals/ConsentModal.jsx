import React from 'react';

/**
 * ConsentModal — Displayed on first login for connected users.
 * Asks the user how they want their data handled (GDPR compliance).
 */
const ConsentModal = ({ isOpen, onChoice }) => {
    if (!isOpen) return null;

    const handleChoice = (choice) => {
        onChoice(choice);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s'
        }}>
            <div style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #FFD700',
                borderRadius: '16px',
                padding: '30px',
                width: '90%',
                maxWidth: '480px',
                boxShadow: '0 0 50px rgba(255, 215, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <h2 style={{
                    margin: 0,
                    color: '#FFD700',
                    textAlign: 'center',
                    fontFamily: '"Metal Mania", cursive',
                    fontSize: '1.5rem',
                    letterSpacing: '2px'
                }}>
                    Bienvenue ! 🤘
                </h2>

                <p style={{
                    color: '#ccc',
                    textAlign: 'center',
                    margin: 0,
                    lineHeight: '1.6',
                    fontSize: '0.95rem'
                }}>
                    Comment souhaitez-vous utiliser votre Running Order ?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Option 1: Full community */}
                    <button
                        onClick={() => handleChoice('full')}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #4CAF50',
                            background: 'rgba(76, 175, 80, 0.1)',
                            color: '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}
                    >
                        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🌍</span>
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#4CAF50' }}>
                                Sauvegarder + Communauté
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#999', lineHeight: '1.4' }}>
                                Vos favoris sont sauvegardés sur le serveur et visibles par les autres membres.
                            </div>
                        </div>
                    </button>

                    {/* Option 2: Private save */}
                    <button
                        onClick={() => handleChoice('private')}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #2196F3',
                            background: 'rgba(33, 150, 243, 0.1)',
                            color: '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}
                    >
                        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🔒</span>
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#2196F3' }}>
                                Sauvegarder, rester privé
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#999', lineHeight: '1.4' }}>
                                Vos favoris sont sauvegardés sur le serveur mais invisibles pour les autres.
                            </div>
                        </div>
                    </button>

                    {/* Option 3: Local only */}
                    <button
                        onClick={() => handleChoice('local_only')}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #666',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}
                    >
                        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>📱</span>
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#aaa' }}>
                                Mode local uniquement
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#999', lineHeight: '1.4' }}>
                                Rien n'est envoyé au serveur. Vos données restent sur cet appareil.
                            </div>
                        </div>
                    </button>
                </div>

                <p style={{
                    color: '#666',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    margin: 0,
                    lineHeight: '1.5'
                }}>
                    Vous pourrez modifier ce choix à tout moment dans les Paramètres.
                    <br />Seuls votre pseudo, avatar et sélection de groupes sont stockés.
                </p>
            </div>
        </div>
    );
};

export default ConsentModal;
