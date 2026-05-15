import React, { useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { DAYS, STAGE_CONFIG, SIDE_STAGES } from '../../constants';
import SearchBand from '../common/SearchBand';

const chevronBtnStyle = {
    background: 'transparent',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '8px',
    fontSize: '1rem',
    flexShrink: 0,
};

const Navigation = ({ groups, onSelectGroup, isAuthenticated = false, username = null }) => {
    const { state, setDay, setState } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const canUseExtendedView = windowWidth >= 1200;
    const isMobile = windowWidth < 600;

    const toggleCompact = () => setState(prev => ({ ...prev, compact: !prev.compact }));
    const toggleSideScenes = () => setState(prev => ({ ...prev, sideScenes: !prev.sideScenes }));

    // Mardi et Mercredi masqués si sideScenes inactif (uniquement des scènes annexes)
    const visibleDays = state.sideScenes
        ? DAYS
        : DAYS.filter(d => d !== 'Mardi' && d !== 'Mercredi');

    const currentDayIndex = visibleDays.indexOf(state.day);

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

        setState(prev => {
            const newState = { ...prev };
            let hasChanged = false;

            if (config && prev.scenes[config.slug] === false) {
                newState.scenes = { ...prev.scenes, [config.slug]: true };
                hasChanged = true;
            }

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

        if (group.DAY !== state.day) setDay(group.DAY);

        setTimeout(() => { onSelectGroup(group, null); }, 150);
    };

    // Rangée de navigation jours — chevrons invisibles si absent (pour garder le centrage)
    const dayNavRow = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
                onClick={() => handleDayChange(currentDayIndex - 1)}
                style={{ ...chevronBtnStyle, visibility: currentDayIndex > 0 ? 'visible' : 'hidden' }}
            >
                <i className="fa-solid fa-chevron-left"></i>
            </button>
            <h1 style={{ fontFamily: 'Metal Mania', margin: '0 10px', textTransform: 'uppercase', textAlign: 'center' }}>
                {state.day}
            </h1>
            <button
                onClick={() => handleDayChange(currentDayIndex + 1)}
                style={{ ...chevronBtnStyle, visibility: currentDayIndex < visibleDays.length - 1 ? 'visible' : 'hidden' }}
            >
                <i className="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    );

    // Layout mobile (< 600px) : 2 rangées
    if (isMobile) {
        return (
            <>
                {/* Rangée 1 : recherche | utilisateur | switch scènes */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 12px',
                    minHeight: '40px',
                    gap: '8px',
                }}>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                        <SearchBand groups={groups} onSelect={handleSearchSelect} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        {isAuthenticated && username && (
                            <span
                                title={`Connecté en tant que ${username}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.7rem',
                                    color: '#aaa',
                                    background: 'rgba(255,255,255,0.06)',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4CAF50', flexShrink: 0 }}></span>
                                {username}
                            </span>
                        )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={toggleSideScenes}
                            title={state.sideScenes ? "Afficher scènes principales" : "Afficher scènes annexes"}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.9rem',
                            }}
                        >
                            <i className={`fa-solid ${state.sideScenes ? 'fa-guitar' : 'fa-tent'}`}></i>
                        </button>
                    </div>
                </div>

                {/* Rangée 2 : navigation jours */}
                <nav style={{ display: 'flex', alignItems: 'center', margin: '0 0 5px 0', width: 'fit-content', alignSelf: 'center' }}>
                    {dayNavRow}
                </nav>
            </>
        );
    }

    // Layout tablette/desktop (>= 600px)
    return (
        <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
            position: 'relative',
            minHeight: '60px',
        }}>
            {/* Recherche à gauche */}
            <div style={{ position: 'absolute', left: '20px' }}>
                <SearchBand groups={groups} onSelect={handleSearchSelect} />
            </div>

            {/* Navigation Jours (Centre) — chevrons invisibles pour garder le centrage */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                    onClick={() => handleDayChange(currentDayIndex - 1)}
                    style={{ ...chevronBtnStyle, visibility: currentDayIndex > 0 ? 'visible' : 'hidden' }}
                >
                    <i className="fa-solid fa-chevron-left"></i>
                </button>
                <h1 style={{ fontFamily: 'Metal Mania', margin: '0 15px', textTransform: 'uppercase' }}>
                    {state.day}
                </h1>
                <button
                    onClick={() => handleDayChange(currentDayIndex + 1)}
                    style={{ ...chevronBtnStyle, visibility: currentDayIndex < visibleDays.length - 1 ? 'visible' : 'hidden' }}
                >
                    <i className="fa-solid fa-chevron-right"></i>
                </button>
            </div>

            {/* Toggle Vue (Droite) */}
            <button
                onClick={canUseExtendedView ? toggleCompact : toggleSideScenes}
                title={canUseExtendedView
                    ? (state.compact ? "Passer en vue étendue" : "Passer en vue compacte")
                    : (state.sideScenes ? "Afficher scènes principales" : "Afficher scènes annexes")
                }
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
                    cursor: 'pointer',
                }}
            >
                {canUseExtendedView ? (
                    <>
                        <span>{state.compact ? "VUE ÉTENDUE" : "VUE COMPACTE"}</span>
                        <i className={`fa-solid ${!state.compact ? 'fa-table-columns' : 'fa-list'}`}></i>
                    </>
                ) : (
                    <>
                        <span>{state.sideScenes ? "SCÈNES PRINC." : "SCÈNES ANNEXES"}</span>
                        <i className={`fa-solid ${state.sideScenes ? 'fa-guitar' : 'fa-tent'}`}></i>
                    </>
                )}
            </button>
        </nav>
    );
};

export default Navigation;
