import React, { useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { DAYS } from '../../constants';

const Navigation = () => {
    const { state, setDay, setState } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const canUseExtendedView = windowWidth >= 1200;

    const toggleCompact = () => {
        setState(prev => ({ ...prev, compact: !prev.compact }));
    };

    // Si sideScenes n'est pas activé, exclure le Mercredi
    const visibleDays = state.sideScenes
        ? DAYS
        : DAYS.filter(d => d !== 'Mercredi');

    const currentDayIndex = visibleDays.indexOf(state.day);

    // Si le jour actuel n'est pas dans les jours visibles (ex: Mercredi désactivé),
    // basculer automatiquement sur le Jeudi
    React.useEffect(() => {
        if (currentDayIndex === -1 && visibleDays.length > 0) {
            setDay(visibleDays[0]);
        }
    }, [state.sideScenes, currentDayIndex, visibleDays, setDay]);

    const handleDayChange = (newIndex) => {
        if (newIndex >= 0 && newIndex < visibleDays.length) {
            setDay(visibleDays[newIndex]);
        }
    };

    return (
        <nav style={{ position: 'relative' }}>
            {currentDayIndex > 0 && (
                <button onClick={() => handleDayChange(currentDayIndex - 1)}>
                    <i className="fa-solid fa-chevron-left"></i>
                </button>
            )}
            <h1 style={{ fontFamily: 'Metal Mania' }}>{state.day}</h1>
            {currentDayIndex < visibleDays.length - 1 && (
                <button onClick={() => handleDayChange(currentDayIndex + 1)}>
                    <i className="fa-solid fa-chevron-right"></i>
                </button>
            )}

            {canUseExtendedView && (
                <button
                    onClick={toggleCompact}
                    title={state.compact ? "Passer en vue étendue" : "Passer en vue compacte"}
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '1rem',
                        opacity: 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '6px 12px',
                        borderRadius: '20px'
                    }}
                >
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {state.compact ? "VUE ÉTENDUE" : "VUE COMPACTE"}
                    </span>
                    <i className={`fa-solid ${!state.compact ? 'fa-table-columns' : 'fa-list'}`}></i>
                </button>
            )}
        </nav>
    );
};

export default Navigation;
