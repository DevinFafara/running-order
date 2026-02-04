import React, { useState, useEffect } from 'react';
import '../panels/StatsPanel.css'; // Re-use panel styles or create new ones? Let's use simple inline or basic styles for now to be quick.

const CustomEventModal = ({ isOpen, onClose, onSave, defaultDay }) => {
    const [title, setTitle] = useState('');
    const [day, setDay] = useState(defaultDay || 'Jeudi');
    const [startTime, setStartTime] = useState('12:00');
    const [endTime, setEndTime] = useState('13:00');
    const [type, setType] = useState('apero'); // apero, repas, dodo, autre

    useEffect(() => {
        if (isOpen) {
            setDay(defaultDay || 'Jeudi');
            // Reset or keep previous? Reset is safer.
        }
    }, [isOpen, defaultDay]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            id: Date.now(),
            title,
            day,
            startTime,
            endTime,
            type
        });
        onClose();
    };

    // Icons mapping
    const icons = {
        apero: '🍺',
        repas: '🍔',
        dodo: '💤',
        autre: '📍'
    };

    return (
        <div className="stats-panel-overlay" onClick={onClose}>
            <div className="stats-panel-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', maxHeight: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: '#FFD700' }}>Ajouter un Perso</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* TYPE SELECTION */}
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '10px' }}>
                        {Object.entries(icons).map(([key, icon]) => (
                            <div
                                key={key}
                                onClick={() => setType(key)}
                                style={{
                                    cursor: 'pointer',
                                    padding: '10px',
                                    borderRadius: '50%',
                                    background: type === key ? '#FFD700' : 'rgba(255,255,255,0.1)',
                                    color: type === key ? '#000' : '#fff',
                                    fontSize: '1.5rem',
                                    transition: 'all 0.2s',
                                    border: type === key ? '2px solid #fff' : '2px solid transparent'
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
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Début</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid #555',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Fin</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid #555',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        style={{
                            marginTop: '20px',
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
                        Créer le créneau
                    </button>

                </form>
            </div>
        </div>
    );
};

export default CustomEventModal;
