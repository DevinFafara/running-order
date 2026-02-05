import React, { useState, useEffect } from 'react';
import '../panels/StatsPanel.css'; // Re-use panel styles or create new ones? Let's use simple inline or basic styles for now to be quick.

const CustomEventModal = ({ isOpen, onClose, onSave, onDelete, defaultDay, eventToEdit }) => {
    const [title, setTitle] = useState('');
    const [day, setDay] = useState(defaultDay || 'Jeudi');
    const [type, setType] = useState('apero'); // apero, repas, dodo, autre

    // State for split time fields
    const [startH, setStartH] = useState('12');
    const [startM, setStartM] = useState('00');
    const [endH, setEndH] = useState('13');
    const [endM, setEndM] = useState('00');

    // UX States
    const [errorMessage, setErrorMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setErrorMessage('');
            setShowDeleteConfirm(false);
            if (eventToEdit) {
                setTitle(eventToEdit.title || '');
                setDay(eventToEdit.day || defaultDay || 'Jeudi');
                setType(eventToEdit.type || 'apero');
                const [sH, sM] = (eventToEdit.startTime || '12:00').split(':');
                setStartH(sH);
                setStartM(sM);
                const [eH, eM] = (eventToEdit.endTime || '13:00').split(':');
                setEndH(eH);
                setEndM(eM);
            } else {
                setDay(defaultDay || 'Jeudi');
                setTitle('');
                setType('apero');
                setStartH('12');
                setStartM('00');
                setEndH('13');
                setEndM('00');
            }
        }
    }, [isOpen, defaultDay, eventToEdit]);

    // Icons mapping
    const icons = {
        apero: '🍺',
        repas: '🍔',
        dodo: '💤',
        transport: '🚗',
        course: '🛒',
        camping: '⛺',
        ami: '👥',
        autre: '📍'
    };

    // Helper for Time Selects
    const hoursOptions = [
        ...Array.from({ length: 14 }, (_, i) => i + 10), // 10 to 23
        ...Array.from({ length: 5 }, (_, i) => i),       // 00 to 04
    ].map(h => h.toString().padStart(2, '0'));

    const minutesOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        setErrorMessage(''); // Clear previous errors

        // Duration validation (min 30 mins)
        const sTotal = parseInt(startH) * 60 + parseInt(startM);
        let eTotal = parseInt(endH) * 60 + parseInt(endM);

        if (eTotal < sTotal) {
            eTotal += 24 * 60;
        }

        if (eTotal - sTotal < 30) {
            setErrorMessage("La durée de l'événement doit être d'au moins 30 minutes.");
            return;
        }

        onSave({
            id: eventToEdit ? eventToEdit.id : Date.now(),
            title,
            day,
            startTime: `${startH}:${startM}`,
            endTime: `${endH}:${endM}`,
            type
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="stats-panel-overlay" onClick={onClose}>
            <div className="stats-panel-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', maxHeight: 'auto' }}>
                <div style={{ position: 'relative', marginBottom: '20px', textAlign: 'center' }}>
                    <h2 style={{ margin: 0, color: '#FFD700', fontSize: '1.2rem', textTransform: 'uppercase' }}>{eventToEdit ? 'Modifier' : 'Ajouter'} un créneau</h2>
                    <button onClick={onClose} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* TYPE SELECTION */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '10px' }}>
                        {Object.entries(icons).map(([key, icon]) => (
                            <div
                                key={key}
                                onClick={() => setType(key)}
                                style={{
                                    cursor: 'pointer',
                                    padding: '10px',
                                    borderRadius: '12px',
                                    background: type === key ? '#FFD700' : 'rgba(255,255,255,0.05)',
                                    color: type === key ? '#000' : '#fff',
                                    fontSize: '1.8rem',
                                    transition: 'all 0.2s',
                                    border: type === key ? '2px solid #FFD700' : '2px solid transparent',
                                    width: '100%',
                                    aspectRatio: '1', // Square cells
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title={key}
                            >
                                {icon}
                            </div>
                        ))}
                    </div>

                    {/* TITRE */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Titre</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Apéro avec Michel"
                            required
                            maxLength={20}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid #555',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {/* JOUR */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Jour</label>
                        <select
                            value={day}
                            onChange={e => setDay(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid #555',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        >
                            {['Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    {/* HORAIRES */}
                    <div style={{ display: 'flex', gap: '20px' }}>
                        {/* DEBUT */}
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Début</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <select
                                    value={startH}
                                    onChange={e => setStartH(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid #555',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '16px', // Prevents iOS zoom and improves readability
                                        height: '45px'
                                    }}
                                >
                                    {hoursOptions.map(h => <option key={h} value={h}>{h}h</option>)}
                                </select>
                                <select
                                    value={startM}
                                    onChange={e => setStartM(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid #555',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '16px',
                                        height: '45px'
                                    }}
                                >
                                    {minutesOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* FIN */}
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Fin</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <select
                                    value={endH}
                                    onChange={e => setEndH(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid #555',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '16px',
                                        height: '45px'
                                    }}
                                >
                                    {hoursOptions.map(h => <option key={h} value={h}>{h}h</option>)}
                                </select>
                                <select
                                    value={endM}
                                    onChange={e => setEndM(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid #555',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '16px',
                                        height: '45px'
                                    }}
                                >
                                    {minutesOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                        <div style={{
                            color: '#ff6b6b',
                            background: 'rgba(255,107,107,0.1)',
                            padding: '10px',
                            borderRadius: '5px',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            border: '1px solid rgba(255,107,107,0.3)'
                        }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '5px' }}></i>
                            {errorMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            marginTop: '10px',
                            padding: '12px',
                            background: '#FFD700',
                            color: '#000',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                        }}
                    >
                        {eventToEdit ? 'Enregistrer' : 'Créer le créneau'}
                    </button>

                    {eventToEdit && (
                        !showDeleteConfirm ? (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                style={{
                                    marginTop: '5px',
                                    padding: '12px',
                                    background: 'rgba(255, 0, 0, 0.15)',
                                    color: '#ff6b6b',
                                    fontWeight: 'bold',
                                    border: '1px solid #ff6b6b',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Supprimer
                            </button>
                        ) : (
                            <div style={{
                                marginTop: '5px',
                                padding: '15px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid #ff6b6b',
                                borderRadius: '8px',
                                textAlign: 'center',
                                animation: 'fadeIn 0.2s'
                            }}>
                                <p style={{ color: 'white', margin: '0 0 15px 0', fontSize: '0.95rem' }}>
                                    Voulez-vous vraiment supprimer ce créneau ?
                                </p>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        style={{
                                            padding: '8px 20px',
                                            background: 'transparent',
                                            border: '1px solid #aaa',
                                            color: '#ccc',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Non
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { onDelete(eventToEdit.id); onClose(); }}
                                        style={{
                                            padding: '8px 20px',
                                            background: '#ff6b6b',
                                            border: 'none',
                                            color: 'white',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Oui
                                    </button>
                                </div>
                            </div>
                        )
                    )}

                </form>
            </div>
        </div>
    );
};

export default CustomEventModal;
