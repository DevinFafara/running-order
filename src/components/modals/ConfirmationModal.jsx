import React from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmer", cancelText = "Annuler", isDestructive = false }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300, // Higher than ImportModal and ContactsPanel
            backdropFilter: 'blur(3px)',
            animation: 'fadeIn 0.2s'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#222',
                border: `1px solid ${isDestructive ? '#d32f2f' : '#FFD700'}`,
                borderRadius: '12px',
                padding: '25px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                textAlign: 'center'
            }} onClick={e => e.stopPropagation()}>

                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>
                    {title}
                </h3>

                <p style={{ color: '#ccc', margin: 0, lineHeight: '1.5' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 20px',
                            background: 'transparent',
                            border: '1px solid #555',
                            borderRadius: '8px',
                            color: '#ccc',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{
                            padding: '12px 20px',
                            background: isDestructive ? '#d32f2f' : '#FFD700',
                            border: 'none',
                            borderRadius: '8px',
                            color: isDestructive ? 'white' : 'black',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
