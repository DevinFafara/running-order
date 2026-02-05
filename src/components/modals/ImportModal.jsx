import React from 'react';

const ImportModal = ({ isOpen, onClose, data, onReplace, onSave, onView, isContactView = false }) => {
    const [confirmMode, setConfirmMode] = React.useState('none'); // 'none', 'replace'

    // Reset state on close logic needs to happen in parent or effect?
    // Let's us Effect to reset when data/isOpen changes
    React.useEffect(() => {
        if (isOpen) setConfirmMode('none');
    }, [isOpen, data]);

    if (!isOpen || !data) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s'
        }}>
            <div style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #FFD700',
                borderRadius: '16px',
                padding: '30px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 0 50px rgba(255, 215, 0, 0.2)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                textAlign: 'center'
            }}>

                <div style={{ fontSize: '3rem', marginBottom: '-10px' }}>📥</div>

                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.8rem' }}>
                    RO de <span style={{ color: '#FFD700' }}>{data.username}</span>
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

                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '20px',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-around'
                }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFD700' }}>{data.bandCount}</div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Groupes</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>{data.eventCount}</div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Créneaux Perso</div>
                    </div>
                </div>

                <p style={{ color: '#ccc', margin: 0, fontSize: '1rem', lineHeight: '1.5' }}>
                    {confirmMode === 'replace'
                        ? <span style={{ color: '#ff6b6b' }}>Attention : Cette action est irréversible.</span>
                        : "Que souhaitez-vous faire ?"
                    }
                </p>


                {confirmMode === 'none' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {!isContactView && (
                            <>
                                <button
                                    onClick={() => onSave(data)}
                                    style={{
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid #4CAF50',
                                        background: 'rgba(76, 175, 80, 0.1)',
                                        color: '#4CAF50',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    <i className="fa-solid fa-address-book"></i> Enregistrer dans mes contacts
                                </button>

                                <div style={{ height: '1px', background: '#333', margin: '10px 0' }}></div>
                            </>
                        )}

                        <button
                            onClick={() => onView(data)}
                            style={{
                                padding: '15px',
                                borderRadius: '10px',
                                border: '1px solid #2196F3',
                                background: 'rgba(33, 150, 243, 0.1)',
                                color: '#2196F3',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            <i className="fa-solid fa-eye"></i> Consulter (Mode Invité)
                        </button>

                        <button
                            onClick={() => setConfirmMode('replace')}
                            style={{
                                padding: '15px',
                                borderRadius: '10px',
                                border: '1px solid #d32f2f',
                                background: 'rgba(211, 47, 47, 0.1)',
                                color: '#ff8a80',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            <i className="fa-solid fa-trash-arrow-up"></i> Remplacer ma liste
                        </button>
                    </div>
                ) : (
                    // CONFIRMATION VIEW
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s' }}>
                        <div style={{
                            background: 'rgba(255,0,0,0.1)',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #500',
                            color: '#ffaaaa',
                            fontSize: '0.9rem'
                        }}>
                            Vous allez supprimer TOUTE votre sélection actuelle (groupes et commentaires) pour la remplacer par celle de <strong>{data.username}</strong>.
                        </div>

                        <button
                            onClick={() => onReplace(data)}
                            style={{
                                padding: '15px',
                                borderRadius: '10px',
                                border: 'none',
                                background: '#d32f2f',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            <i className="fa-solid fa-check"></i> Oui, tout remplacer
                        </button>

                        <button
                            onClick={() => setConfirmMode('none')}
                            style={{
                                padding: '15px',
                                borderRadius: '10px',
                                border: '1px solid #555',
                                background: 'transparent',
                                color: '#ccc',
                                fontSize: '1rem',
                                cursor: 'pointer',
                            }}
                        >
                            Annuler
                        </button>
                    </div>
                )}



            </div>
        </div>
    );
};

export default ImportModal;
