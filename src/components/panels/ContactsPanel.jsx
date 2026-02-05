import React, { useState } from 'react';
import ImportModal from '../modals/ImportModal';

const ContactsPanel = ({ isOpen, onClose, contacts, onDeleteContact, onCheckContact }) => {
    const [selectedContactData, setSelectedContactData] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    if (!isOpen) return null;

    const handleCheck = (contact) => {
        // We need to re-inflate date from contact.
        // The ImportModal expects 'data' object.
        // We stored { username, bands: {}, customEvents: [] } in contacts.
        setSelectedContactData(contact.data);
        setIsImportModalOpen(true);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(3px)',
            animation: 'fadeIn 0.2s'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '16px',
                padding: '20px',
                width: '90%',
                maxWidth: '400px',
                border: '1px solid #333',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                position: 'relative',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>

                <h2 style={{
                    marginTop: 0,
                    marginBottom: '20px',
                    color: '#FFD700',
                    textAlign: 'center',
                    fontFamily: '"Metal Mania", cursive',
                    letterSpacing: '1px'
                }}>
                    Mes Contacts
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

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                    {contacts.length === 0 ? (
                        <p style={{ color: '#666', textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>
                            Aucun contact enregistré.<br />
                            Partagez des liens pour en ajouter !
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {contacts.map(contact => (
                                <div key={contact.id} style={{
                                    backgroundColor: '#2a2a2a',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    border: '1px solid #444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '1rem' }}>
                                            {contact.username}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                            {Object.keys(contact.data.bands).length} groupes
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleCheck(contact)}
                                            title="Voir le RO"
                                            style={{
                                                background: '#FFD700',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '28px',
                                                height: '28px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <i className="fa-solid fa-eye" style={{ color: '#000', fontSize: '0.8rem' }}></i>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Supprimer ${contact.username} ?`)) {
                                                    onDeleteContact(contact.id);
                                                }
                                            }}
                                            title="Supprimer"
                                            style={{
                                                background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid #555',
                                                borderRadius: '50%',
                                                width: '28px',
                                                height: '28px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <i className="fa-solid fa-trash" style={{ color: '#ff6b6b', fontSize: '0.8rem' }}></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isImportModalOpen && selectedContactData && (
                    <ImportModal
                        isOpen={isImportModalOpen}
                        onClose={() => {
                            setIsImportModalOpen(false);
                            setSelectedContactData(null);
                        }}
                        data={selectedContactData}
                        // onMerge removed as requested previously
                        onReplace={(data) => {
                            onCheckContact(data, 'replace');
                            setIsImportModalOpen(false);
                        }}
                        onSave={() => { }}
                        onView={(data) => {
                            onCheckContact(data, 'view');
                            setIsImportModalOpen(false);
                            onClose();
                        }}
                        isContactView={true}
                    />
                )}
            </div>
        </div>
    );
};

export default ContactsPanel;
