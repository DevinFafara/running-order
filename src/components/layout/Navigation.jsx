import React, { useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { DAYS, STAGE_CONFIG, SIDE_STAGES } from '../../constants';
import SearchBand from '../common/SearchBand';

const Navigation = ({ groups, onSelectGroup }) => {
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

    const handleSearchSelect = (group) => {
        const config = STAGE_CONFIG[group.SCENE];
        const isSideStage = SIDE_STAGES.includes(group.SCENE);

        // 1. Mettre à jour les filtres si nécessaire
        setState(prev => {
            const newState = { ...prev };
            let hasChanged = false;

            // Activer la scène si elle est masquée
            if (config && prev.scenes[config.slug] === false) {
                newState.scenes = { ...prev.scenes, [config.slug]: true };
                hasChanged = true;
            }

            // Gérer le basculement automatique scènes principales / annexes sur mobile (< 1200px)
            if (window.innerWidth < 1200) {
                if (isSideStage && !prev.sideScenes) {
                    newState.sideScenes = true;
                    hasChanged = true;
                } else if (!isSideStage && prev.sideScenes) {
                    newState.sideScenes = false;
                    hasChanged = true;
                }
            }

            return hasChanged ? newState : prev;
        });

        // 2. Changer de jour si nécessaire
        if (group.DAY !== state.day) {
            setDay(group.DAY);
        }

        // 3. Sélectionner le groupe (petit délai pour laisser le temps au DOM de se mettre à jour)
        setTimeout(() => {
            onSelectGroup(group, null);
        }, 150);
    };

    return (
        <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
            position: 'relative',
            minHeight: '60px'
        }}>
            {/* Recherche à gauche */}
            <div style={{ position: 'absolute', left: '20px' }}>
                <SearchBand groups={groups} onSelect={handleSearchSelect} />
            </div>

            {/* Navigation Jours (Centre) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {currentDayIndex > 0 && (
                    <button onClick={() => handleDayChange(currentDayIndex - 1)}>
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                )}
                <h1 style={{ fontFamily: 'Metal Mania', margin: '0 15px', textTransform: 'uppercase' }}>
                    {state.day}
                </h1>
                {currentDayIndex < visibleDays.length - 1 && (
                    <button onClick={() => handleDayChange(currentDayIndex + 1)}>
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                )}
            </div>

            {/* Toggle Vue (Droite) */}
            {canUseExtendedView && (
                <button
                    onClick={toggleCompact}
                    title={state.compact ? "Passer en vue étendue" : "Passer en vue compacte"}
                    style={{
                        position: 'absolute',
                        right: '25px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        opacity: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    <span>{state.compact ? "VUE ÉTENDUE" : "VUE COMPACTE"}</span>
                    <i className={`fa-solid ${!state.compact ? 'fa-table-columns' : 'fa-list'}`}></i>
                </button>
            )}
        </nav>
    );
};

export default Navigation;
