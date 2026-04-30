import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { STAGE_CONFIG } from '../../constants';
import Band from '../common/Band';
import TagMenu from '../common/TagMenu';

// Composant HourTag (comme dans running-order original)
const HourTag = ({ hour }) => (
    <div className='hours' style={{ top: `${hour.top - 5}px` }}>
        <span className='hourtags'>{hour.label}</span>
    </div>
);

const CustomEventOverlay = ({ event, onEdit, columnCount, windowWidth, dayStartMinutes, dayEndMinutes }) => {
    const { state } = useCheckedState();

    // 1. Parse times
    if (typeof event.startTime !== 'string' || typeof event.endTime !== 'string') return null;

    const [startH, startM] = event.startTime.split(':').map(Number);
    const [endH, endM] = event.endTime.split(':').map(Number);

    // 2. Adjust for night hours (< 6h)
    let hDebut = startH;
    let hFin = endH;
    if (hDebut < 6) hDebut += 24;
    // Special handling if end < start (e.g. 23:00 - 01:00) where 01 < 6 is true, so +24 -> 25.
    if (hFin < 6) hFin += 24;

    const debutMinutes = hDebut * 60 + startM;
    const finMinutes = hFin * 60 + endM;
    const duration = finMinutes - debutMinutes;
    const height = duration; // 1px = 1min

    // 3. Calculate Top using Dynamic Bounds
    const getTop = () => {
        if (state.reverse) {
            return debutMinutes - dayStartMinutes;
        } else {
            return dayEndMinutes - finMinutes;
        }
    };

    // Offset due to Scene Header (~85px) + Margin (10px) + 5px calibration
    // Must match CSS .compact-scene-couple-header min-height + .scene-bands margin-top
    const HEADER_OFFSET = 100;
    const top = getTop() + HEADER_OFFSET;

    const colWidth = 300 + (windowWidth * 0.02);
    const calculatedWidth = columnCount * colWidth;

    const [isMasked, setIsMasked] = useState(false);

    return (
        <div
            className="custom-event-overlay"
            style={{
                position: 'absolute',
                top: `${top}px`,
                height: `${height}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: `${calculatedWidth}px`,
                maxWidth: '98%',
                backgroundColor: isMasked ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.45)',
                border: isMasked ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                zIndex: 50, // Above everything
                pointerEvents: isMasked ? 'none' : 'auto', // Allow clicks through when masked
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center', // Center content
                padding: '0 15px',
                color: '#FFFFFF',
                textShadow: isMasked ? 'none' : '0 1px 2px rgba(0,0,0,0.8)',
                backdropFilter: isMasked ? 'none' : 'blur(2px)',
                transition: 'all 0.2s ease'
            }}
        >
            {/* Left Button: Mask/Unmask */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsMasked(!isMasked);
                }}
                style={{
                    position: 'absolute',
                    left: '15px',
                    background: 'rgba(0,0,0,0.3)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                    zIndex: 51,
                    pointerEvents: 'auto'
                }}
                title={isMasked ? "Afficher" : "Masquer"}
            >
                <i className={isMasked ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"}></i>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', opacity: isMasked ? 0.1 : 1, transition: 'opacity 0.2s' }}>
                <span style={{ fontSize: '1.8rem' }}>
                    {event.type === 'apero' && '🍺'}
                    {event.type === 'repas' && '🍔'}
                    {event.type === 'dodo' && '💤'}
                    {event.type === 'transport' && '🚗'}
                    {event.type === 'course' && '🛒'}
                    {event.type === 'camping' && '⛺'}
                    {event.type === 'ami' && '👥'}
                    {event.type === 'autre' && '📍'}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{event.title}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: '500' }}>{event.startTime} - {event.endTime}</div>
                </div>
            </div>

            <div style={{ position: 'absolute', right: '15px', display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) onEdit(event);
                        else alert('Modification bientôt disponible');
                    }}
                    style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}
                    title="Modifier"
                >
                    <i className="fa-solid fa-pen"></i>
                </button>
            </div>
        </div>
    );
};

const DayView = ({ groups, selectGroup, selectedGroupId, day, customEvents = [], onDeleteCustomEvent, onEditCustomEvent }) => {
    const { state, setState } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [tagMenuState, setTagMenuState] = useState({ open: false, groupId: null, position: { x: 0, y: 0 } });

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Vérifier si une scène est visible
    const isSceneVisible = (sceneName) => {
        if (!sceneName) return false;
        const config = STAGE_CONFIG[sceneName];
        return config ? state.scenes[config.slug] !== false : false;
    };

    // Construire les paires de scènes (logique originale CompactDay.js)
    const buildSceneCouples = () => {
        if (!groups) return [];

        const isSmallScreen = windowWidth < 1200;
        let sceneCouples = [];

        // Couples scènes annexes (HELLSTAGE + METAL_CORNER ensemble selon demande)
        const annexCouples = [
            ["HELLSTAGE", "METAL_CORNER"],
            ["PURPLE_HOUSE", null]
        ];

        // Couples scènes principales
        let mainCouples = [["MAINSTAGE 1", "MAINSTAGE 2"], ["WARZONE", "VALLEY"], ["TEMPLE", "ALTAR"]];

        // Réarrangement si certaines scènes sont masquées pour n'afficher qu'une colonne
        // au lieu de deux demi-vides. Les couples possibles dépendent du jour :
        //
        // Jours normaux (Jeu/Ven/Sam) : Warzone et Altar ne jouent jamais en même temps,
        //   idem Temple et Valley → on peut fusionner [Warzone+Altar] ou [Temple+Valley].
        //
        // Dimanche 2026 : Warzone et Altar jouent simultanément, idem Temple et Valley.
        //   En revanche, Altar+Valley et Temple+Warzone ne se chevauchent pas.
        if (day === 'Dimanche') {
            if (
                (!state.scenes["warzone"] && !state.scenes["temple"] && state.scenes["altar"] && state.scenes["valley"]) ||
                (state.scenes["warzone"] && state.scenes["temple"] && !state.scenes["altar"] && !state.scenes["valley"])
            ) {
                mainCouples = [["MAINSTAGE 1", "MAINSTAGE 2"], ["ALTAR", "VALLEY"], ["TEMPLE", "WARZONE"]];
            }
        } else {
            if (
                (!state.scenes["warzone"] && !state.scenes["altar"] && state.scenes["temple"] && state.scenes["valley"]) ||
                (state.scenes["warzone"] && state.scenes["altar"] && !state.scenes["temple"] && !state.scenes["valley"])
            ) {
                mainCouples = [["MAINSTAGE 1", "MAINSTAGE 2"], ["WARZONE", "ALTAR"], ["TEMPLE", "VALLEY"]];
            }
        }

        if (state.sideScenes) {
            if (isSmallScreen) {
                // < 1200px : Afficher UNIQUEMENT les scènes annexes (Toggle exclusif)
                sceneCouples = annexCouples;
            } else {
                // >= 1200px : Afficher TOUT (Principales + Annexes à la suite)
                sceneCouples = [...mainCouples, ...annexCouples];
            }
        } else {
            // SideScenes OFF : Afficher uniquement les principales
            sceneCouples = mainCouples;
        }

        // Filtrer les couples qui sont entièrement vides (aucun groupe programmé ce jour-là sur aucune des 2 scènes)
        return sceneCouples.filter(couple => {
            const s1 = couple[0];
            const s2 = couple[1];

            const hasGroups1 = s1 && groups.some(g => g.SCENE === s1);
            const hasGroups2 = s2 && groups.some(g => g.SCENE === s2);

            return hasGroups1 || hasGroups2;
        });
    };

    const handleTagClick = (groupId, position) => {
        const menuWidth = 240;
        const menuHeight = 350;
        let x = position.x;
        let y = position.y;

        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }

        setTagMenuState({ open: true, groupId, position: { x, y } });
    };

    const closeTagMenu = () => {
        setTagMenuState({ open: false, groupId: null, position: { x: 0, y: 0 } });
    };

    const sceneCouples = buildSceneCouples();

    const currentDay = day || (groups && groups.length > 0 ? groups[0].DAY : 'Vendredi');

    // Filter Custom Events for this day
    const todaysEvents = customEvents.filter(e => e.day === currentDay);

    // --- DYNAMIC DAY BOUNDS ---
    const getDayBounds = () => {
        // 1. Base Defaults (based on previous logic)
        let baseStart = 10 * 60; // 10:00 default
        let baseEnd = 26 * 60;   // 02:00 default

        const extendedEnd = state.sideScenes ? 28 * 60 : 26 * 60;

        if (currentDay === 'Mercredi') {
            baseStart = 16 * 60;
            baseEnd = 25 * 60;
        } else if (currentDay === 'Jeudi') {
            baseStart = state.sideScenes ? 11 * 60 : 16 * 60;
            baseEnd = extendedEnd;
        } else if (currentDay === 'Dimanche') {
            baseStart = 10 * 60;
            baseEnd = 25 * 60;
        } else {
            baseStart = 10 * 60;
            baseEnd = extendedEnd;
        }

        let minStart = baseStart;
        let maxEnd = baseEnd;

        // 2. Check Custom Events
        todaysEvents.forEach(event => {
            const [sH, sM] = event.startTime.split(':').map(Number);
            const [eH, eM] = event.endTime.split(':').map(Number);

            // Adjust +24h if needed (consistent with Band/Overlay logic: < 6h is next day)
            let startMins = sH * 60 + sM;
            let endMins = eH * 60 + eM;

            if (sH < 6) startMins += 24 * 60;
            if (eH < 6) endMins += 24 * 60;
            // Also if end is literally smaller than start (e.g. 23:00 - 01:00), end implies next day if not already caught
            if (endMins < startMins) endMins += 24 * 60;

            if (startMins < minStart) minStart = startMins;
            if (endMins > maxEnd) maxEnd = endMins;
        });

        // 3. Check Groups (optional safety, theoretically covers official bounds but maybe there are outliers?)
        // Skip for performance as official bounds usually cover official groups. 
        // But if a group is added outside standard time, it should expand too? 
        // Let's rely on standard logic for groups as they are static.

        return { startMin: minStart, endMin: maxEnd };
    };

    const { startMin, endMin } = getDayBounds();
    const dayStartMinutes = startMin;
    const dayEndMinutes = endMin;

    const getSceneBandsHeight = () => `${dayEndMinutes - dayStartMinutes}px`;

    const getHours = () => {
        const hours = [];
        const startH = Math.floor(dayStartMinutes / 60);
        const endH = Math.ceil(dayEndMinutes / 60);

        for (let h = startH; h <= endH; h++) {
            const displayH = h >= 24 ? h - 24 : h;
            const hourLabel = `${displayH.toString().padStart(2, '0')}:00`;
            const timeInMinutes = h * 60;

            // Calculate absolute top position based on current view mode
            let top;
            if (state.reverse) {
                // Inverted: Morning at top (0px = dayStartMinutes)
                top = timeInMinutes - dayStartMinutes;
            } else {
                // Normal: Evening at top (0px = dayEndMinutes)
                top = dayEndMinutes - timeInMinutes;
            }

            hours.push({ label: hourLabel, top });
        }
        return hours;
    };

    // Vue étendue (6+ colonnes) sur grands écrans
    const canUseExtendedView = windowWidth >= 1200;
    const isExtendedView = !state.compact && canUseExtendedView;

    if (!groups) return null;

    const hours = getHours();

    const toggleCompact = () => {
        setState(prev => ({ ...prev, compact: !prev.compact }));
    };

    // Toolbar (only visible if can use extended view)
    const renderToolbar = () => {
        if (!canUseExtendedView) return null;
        return (
            <div className="day-view-toolbar" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '10px 20px',
                marginBottom: '10px'
            }}>
                <button
                    className="view-toggle-btn"
                    onClick={toggleCompact}
                    style={{
                        background: 'rgba(50, 50, 50, 0.8)',
                        border: '1px solid #555',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <i className={`fa-solid ${!state.compact ? 'fa-table-columns' : 'fa-list'}`}></i>
                    {state.compact ? "Vue Étendue" : "Vue Compacte"}
                </button>
            </div>
        );
    };

    // MODE ÉTENDU : colonnes individuelles avec heures
    if (isExtendedView) {
        // Scènes principales
        const mainScenes = ["MAINSTAGE 1", "MAINSTAGE 2", "WARZONE", "VALLEY", "TEMPLE", "ALTAR"];
        // Scènes annexes (ajoutées si sideScenes activé)
        const sideScenes = state.sideScenes ? ["HELLSTAGE", "PURPLE_HOUSE", "METAL_CORNER"] : [];
        const allScenes = [...mainScenes, ...sideScenes];

        // 1. Filtrer selon les préférences utilisateur (checkboxes)
        const enabledScenes = allScenes.filter(isSceneVisible);

        // 2. Filtrer les scènes vides (aucun groupe ce jour-là)
        // Ceci évite d'afficher des colonnes vides (ex: Mainstages le mercredi)
        const visibleScenes = enabledScenes.filter(sceneName => {
            // Pour le mercredi, les scènes principales sont vides, on veut les cacher
            if (currentDay === 'Mercredi' && mainScenes.includes(sceneName)) return false;
            // Pour les autres cas, on vérifie s'il y a des groupes
            return groups.some(g => g.SCENE === sceneName);
        });

        return (
            <div className="compact-day extended-view" style={{ position: 'relative' }}>
                {visibleScenes.map((sceneName, index) => {
                    const sceneGroups = groups.filter(g => g.SCENE === sceneName);
                    const config = STAGE_CONFIG[sceneName];
                    const colorValue = config?.themeColor || '#000';

                    return (
                        <div
                            key={index}
                            className={`scene-column compact-scene-column scene-column-${sceneName.replace(/\s/g, '')}`}
                            style={{
                                background: colorValue,
                                border: 'none'
                            }}
                        >
                            {/* HEADER : image + titre */}
                            <div className="compact-scene-couple-header" style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                                <img className="scene-image" src={config?.icon} alt={sceneName} />
                                <h3>{config?.name}</h3>
                            </div>

                            {/* ZONE DES GROUPES avec heures */}
                            <div className="scene-bands with-hours" style={{ height: getSceneBandsHeight() }}>
                                {/* Tags d'heures */}
                                {hours.map((hour, i) => (
                                    <HourTag key={i} hour={hour} />
                                ))}

                                {/* Groupes */}
                                {sceneGroups.map(group => (
                                    <Band
                                        key={group.id}
                                        group={group}
                                        selectGroup={selectGroup}
                                        selectedGroupId={selectedGroupId}
                                        onTagClick={handleTagClick}
                                        dayStartMinutes={dayStartMinutes}
                                        dayEndMinutes={dayEndMinutes}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {tagMenuState.open && (
                    <TagMenu
                        groupId={tagMenuState.groupId}
                        position={tagMenuState.position}
                        onClose={closeTagMenu}
                    />
                )}

                {/* Custom Events Overlay (Extended Mode) */}
                {todaysEvents.map(event => (
                    <CustomEventOverlay
                        key={event.id}
                        event={event}
                        onEdit={onEditCustomEvent}
                        columnCount={visibleScenes.length}
                        windowWidth={windowWidth}
                        dayStartMinutes={dayStartMinutes}
                        dayEndMinutes={dayEndMinutes}
                    />
                ))}
            </div>
        );
    }

    // MODE COMPACT : 3 colonnes avec paires de scènes

    // Filtrer les couples : on n'affiche la colonne que si au moins une des deux scènes est visible
    const visibleCouples = sceneCouples.filter(couple => {
        const s1 = couple[0];
        const s2 = couple[1];
        return isSceneVisible(s1) || (s2 && isSceneVisible(s2));
    });

    return (
        <div className="compact-day" style={{ position: 'relative', overflowX: 'auto' }}>
            {visibleCouples.map((sceneCouple, index) => {
                const scene1 = sceneCouple[0];
                const scene2 = sceneCouple[1];

                const showS1 = isSceneVisible(scene1);
                const showS2 = scene2 && isSceneVisible(scene2);

                // Couleurs pour le gradient ou couleur unie
                const config1 = STAGE_CONFIG[scene1];
                const config2 = scene2 ? STAGE_CONFIG[scene2] : null;

                let background;
                if (showS1 && showS2) {
                    background = `linear-gradient(to right, ${config1?.themeColor} 0%, ${config1?.themeColor} 50%, ${config2?.themeColor} 50%, ${config2?.themeColor} 100%)`;
                } else if (showS1) {
                    background = config1?.themeColor;
                } else if (showS2) {
                    background = config2?.themeColor;
                }

                const bgStyle = {
                    background: background,
                    // minWidth: '300px' // Not needed if CSS handles it
                };

                const groups1 = groups.filter(g => g.SCENE === scene1);
                const groups2 = scene2 ? groups.filter(g => g.SCENE === scene2) : [];

                return (
                    <div key={index} className="scene-column compact-scene-column" style={bgStyle}>
                        {/* HEADER */}
                        <div className="compact-scene-couple-header">
                            {showS1 && (
                                <div className="header-half" style={{ width: showS2 ? '50%' : '100%' }}>
                                    <img className="scene-image" src={config1?.icon} alt={scene1} />
                                    <h3>{config1?.name}</h3>
                                </div>
                            )}
                            {showS2 && (
                                <div className="header-half" style={{ width: showS1 ? '50%' : '100%' }}>
                                    <img className="scene-image" src={config2?.icon} alt={scene2} />
                                    <h3>{config2?.name}</h3>
                                </div>
                            )}
                        </div>

                        {/* BANDS */}
                        <div className="scene-bands" style={{ height: getSceneBandsHeight() }}>
                            {/* Pas d'heures en mode compact car deux scènes se partagent la colonne */}

                            {/* Groupes Scène 1 */}
                            {showS1 && groups1.map(group => (
                                <Band
                                    key={group.id}
                                    group={group}
                                    selectGroup={selectGroup}
                                    selectedGroupId={selectedGroupId}
                                    halfWidth={showS1 && showS2}
                                    side="left"
                                    onTagClick={handleTagClick}
                                    dayStartMinutes={dayStartMinutes}
                                    dayEndMinutes={dayEndMinutes}
                                />
                            ))}

                            {/* Groupes Scène 2 */}
                            {showS2 && groups2.map(group => (
                                <Band
                                    key={group.id}
                                    group={group}
                                    selectGroup={selectGroup}
                                    selectedGroupId={selectedGroupId}
                                    halfWidth={showS1 && showS2}
                                    side="right"
                                    onTagClick={handleTagClick}
                                    dayStartMinutes={dayStartMinutes}
                                    dayEndMinutes={dayEndMinutes}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}

            {tagMenuState.open && (
                <TagMenu
                    groupId={tagMenuState.groupId}
                    position={tagMenuState.position}
                    onClose={closeTagMenu}
                />
            )}

            {/* Custom Events Overlay (Compact Mode) */}
            {todaysEvents.map(event => (
                <CustomEventOverlay
                    key={event.id}
                    event={event}
                    onEdit={onEditCustomEvent}
                    columnCount={visibleCouples.length}
                    windowWidth={windowWidth}
                    dayStartMinutes={dayStartMinutes}
                    dayEndMinutes={dayEndMinutes}
                />
            ))}
        </div>
    );
};

export default DayView;
