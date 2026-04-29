import React from 'react';

/**
 * ConflictResolver — Displayed when local and server data differ.
 * Lets the user choose which version to keep.
 */
const ConflictResolver = ({ conflictData, onResolve }) => {
    if (!conflictData) return null;

    const { server, local } = conflictData;

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Inconnue';
        try {
            return new Date(dateStr).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Inconnue';
        }
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
                border: '1px solid #FF9800',
                borderRadius: '16px',
                padding: '30px',
                width: '90%',
                maxWidth: '480px',
                boxShadow: '0 0 40px rgba(255, 152, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⚠️</div>
                    <h2 style={{
                        margin: 0,
                        color: '#FF9800',
                        fontFamily: '"Metal Mania", cursive',
                        fontSize: '1.3rem',
                        letterSpacing: '1px'
                    }}>
                        Données différentes détectées
                    </h2>
                </div>

                <p style={{
                    color: '#ccc',
                    textAlign: 'center',
                    margin: 0,
                    fontSize: '0.9rem',
                    lineHeight: '1.5'
                }}>
                    Votre Running Order local diffère de celui sauvegardé sur le serveur.
                    Quelle version souhaitez-vous conserver ?
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Server version */}
                    <button
                        onClick={() => onResolve('server')}
                        style={{
                            flex: 1,
                            padding: '16px 12px',
                            borderRadius: '12px',
                            border: '1px solid #2196F3',
                            background: 'rgba(33, 150, 243, 0.1)',
                            color: '#fff',
                            cursor: 'pointer',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '1.3rem', marginBottom: '8px' }}>☁️</div>
                        <div style={{ fontWeight: 'bold', color: '#2196F3', marginBottom: '6px', fontSize: '0.9rem' }}>
                            Version serveur
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>
                            {server.bandCount} groupes
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>
                            {formatDate(server.updatedAt)}
                        </div>
                    </button>

                    {/* Local version */}
                    <button
                        onClick={() => onResolve('local')}
                        style={{
                            flex: 1,
                            padding: '16px 12px',
                            borderRadius: '12px',
                            border: '1px solid #4CAF50',
                            background: 'rgba(76, 175, 80, 0.1)',
                            color: '#fff',
                            cursor: 'pointer',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '1.3rem', marginBottom: '8px' }}>📱</div>
                        <div style={{ fontWeight: 'bold', color: '#4CAF50', marginBottom: '6px', fontSize: '0.9rem' }}>
                            Version locale
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>
                            {local.bandCount} groupes
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>
                            Sur cet appareil
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictResolver;
