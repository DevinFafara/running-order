import React, { useState, useEffect } from 'react';
import '../panels/StatsPanel.css'; // Re-use panel styles or create new ones? Let's use simple inline or basic styles for now to be quick.

const CustomEventModal = ({ isOpen, onClose, onSave, defaultDay }) => {
    const [title, setTitle] = useState('');
    const [day, setDay] = useState(defaultDay || 'Jeudi');
    // Removed unused startTime/endTime as we use split H/M logic now
    const [type, setType] = useState('apero'); // apero, repas, dodo, autre

    useEffect(() => {
        if (isOpen) {
            setDay(defaultDay || 'Jeudi');
            // Reset or keep previous? Reset is safer.
        }
    }, [isOpen, defaultDay]);



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
        transport: '🚗',
        course: '🛒',
        camping: '⛺',
        ami: '🤠',
        autre: '📍'
    };

    // Helper for Time Selects
    const hoursOptions = [
        ...Array.from({ length: 14 }, (_, i) => i + 10), // 10 to 23
        ...Array.from({ length: 5 }, (_, i) => i),       // 00 to 04
    ].map(h => h.toString().padStart(2, '0'));

    const minutesOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    // State for split time fields
    const [startH, setStartH] = useState('12');
    const [startM, setStartM] = useState('00');
    const [endH, setEndH] = useState('13');
    const [endM, setEndM] = useState('00');

    // Sync split state to consolidated state if needed or just use split state in submit
    // We'll use split state in submit.

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        onSave({
            id: Date.now(),
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
                    <h2 style={{ margin: 0, color: '#FFD700', fontSize: '1.2rem', textTransform: 'uppercase' }}>Ajouter un créneau perso</h2>
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
                                        flex: 1, padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid #555', borderRadius: '4px', color: 'white'
                                    }}
                                >
                                    {hoursOptions.map(h => <option key={h} value={h}>{h}h</option>)}
                                </select>
                                <select
                                    value={startM}
                                    onChange={e => setStartM(e.target.value)}
                                    style={{
                                        flex: 1, padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid #555', borderRadius: '4px', color: 'white'
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
                                        flex: 1, padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid #555', borderRadius: '4px', color: 'white'
                                    }}
                                >
                                    {hoursOptions.map(h => <option key={h} value={h}>{h}h</option>)}
                                </select>
                                <select
                                    value={endM}
                                    onChange={e => setEndM(e.target.value)}
                                    style={{
                                        flex: 1, padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid #555', borderRadius: '4px', color: 'white'
                                    }}
                                >
                                    {minutesOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
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
