import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { STAGE_CONFIG } from '../../constants';
import Band from '../common/Band';
import TagMenu from '../common/TagMenu';

// Composant HourTag (comme dans running-order original)
const HourTag = ({ hour, i }) => (
    <div className='hours' style={{ top: `${(i * 60) - 5}px` }}>
        <span className='hourtags'>{hour}</span>
    </div>
);

const DayView = ({ groups, selectGroup, selectedGroupId, day }) => {
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

        // Réarrangement si certaines scènes sont masquées (logique originale)
        if (
            (!state.scenes["warzone"] && !state.scenes["altar"] && state.scenes["temple"] && state.scenes["valley"]) ||
            (state.scenes["warzone"] && state.scenes["altar"] && !state.scenes["temple"] && !state.scenes["valley"])
        ) {
            mainCouples = [["MAINSTAGE 1", "MAINSTAGE 2"], ["WARZONE", "ALTAR"], ["TEMPLE", "VALLEY"]];
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

    // Déterminer le jour actuel (pour la hauteur dynamique des scene-bands)
    // Hauteurs calculées : 1px = 1 minute
    // - Mercredi: 16h00 → 01h00 = 9h = 540 minutes (scènes annexes uniquement)
    // - Jeudi: 16h00 → 02h00 = 10h = 600 minutes (scènes principales)
    //         11h00 → 04h00 = 17h = 1020 minutes (avec scènes annexes)
    // - Vendredi/Samedi: 10h00 → 04h00 = 18h = 1080 minutes (avec scènes annexes)
    // - Dimanche: 10h00 → 01h00 = 15h = 900 minutes
    const currentDay = day || (groups && groups.length > 0 ? groups[0].DAY : 'Vendredi');
    const getSceneBandsHeight = () => {
        if (currentDay === 'Mercredi') return '540px';
        // Jeudi : 1020px si scènes annexes actives (commence à 11h, finit à 04h), sinon 600px
        if (currentDay === 'Jeudi') return state.sideScenes ? '1020px' : '600px';
        if (currentDay === 'Dimanche') return '900px';
        // Vendredi et Samedi : 1080px si scènes annexes (jusqu'à 04h), sinon 960px
        return state.sideScenes ? '1080px' : '960px';
    };

    // Génération des heures pour les tags (dynamique selon le jour)
    const getHours = () => {
        let hours;
        // Extension des heures de fin si scènes annexes activées (sauf Dimanche et Mercredi)
        // Metal Corner finit à 03h50
        const extendHours = state.sideScenes;
        const extraHours = extendHours ? ["04:00", "03:00"] : [];

        if (currentDay === 'Mercredi') {
            // Mercredi : 16h → 01h (scènes annexes uniquement)
            hours = ["01:00", "00:00", "23:00", "22:00", "21:00", "20:00", "19:00", "18:00", "17:00", "16:00"];
        } else if (currentDay === 'Jeudi') {
            // Jeudi : heures étendues si scènes annexes actives
            if (state.sideScenes) {
                hours = [...extraHours, "02:00", "01:00", "00:00", "23:00", "22:00", "21:00", "20:00", "19:00", "18:00", "17:00", "16:00", "15:00", "14:00", "13:00", "12:00", "11:00"];
            } else {
                hours = ["02:00", "01:00", "00:00", "23:00", "22:00", "21:00", "20:00", "19:00", "18:00", "17:00", "16:00"];
            }
        } else if (currentDay === 'Dimanche') {
            // Dimanche : 10h → 01h (fin plus tôt)
            hours = ["01:00", "00:00", "23:00", "22:00", "21:00", "20:00", "19:00", "18:00", "17:00", "16:00", "15:00", "14:00", "13:00", "12:00", "11:00", "10:00"];
        } else {
            // Vendredi/Samedi : 10h → 02h (schedule complet)
            if (state.sideScenes) {
                hours = [...extraHours, "02:00", "01:00", "00:00", "23:00", "22:00", "21:00", "20:00", "19:00", "18:00", "17:00", "16:00", "15:00", "14:00", "13:00", "12:00", "11:00", "10:00"];
            } else {
                hours = ["02:00", "01:00", "00:00", "23:00", "22:00", "21:00", "20:00", "19:00", "18:00", "17:00", "16:00", "15:00", "14:00", "13:00", "12:00", "11:00", "10:00"];
            }
        }

        if (state.reverse) {
            hours = [...hours].reverse();
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
                                    <HourTag key={i} hour={hour} i={i} />
                                ))}

                                {/* Groupes */}
                                {sceneGroups.map(group => (
                                    <Band
                                        key={group.id}
                                        group={group}
                                        selectGroup={selectGroup}
                                        selectedGroupId={selectedGroupId}
                                        onTagClick={handleTagClick}
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
            </div>
        );
    }

    // MODE COMPACT : 3 colonnes avec paires de scènes

    return (
        <div className="compact-day" style={{ position: 'relative' }}>
            {sceneCouples.map((sceneCouple, index) => {
                const scene1 = sceneCouple[0];
                const scene2 = sceneCouple[1];

                // Couleurs pour le gradient
                const config1 = STAGE_CONFIG[scene1];
                const config2 = scene2 ? STAGE_CONFIG[scene2] : null;

                const bgStyle = {
                    background: config2
                        ? `linear-gradient(to right, ${config1?.themeColor} 0%, ${config1?.themeColor} 50%, ${config2?.themeColor} 50%, ${config2?.themeColor} 100%)`
                        : config1?.themeColor
                };

                const groups1 = groups.filter(g => g.SCENE === scene1);
                const groups2 = scene2 ? groups.filter(g => g.SCENE === scene2) : [];

                // Check visibility logic (optional optimisation, but CSS handles it via display:flex usually? 
                // Actually previous logic used isSceneVisible to hide/swap colors. 
                // Let's stick to the simpler visual rendering for now as the 'compact-day' layout implies strict columns.
                // If scenes are toggled off via settings, usually we want to keep the column structure or hide it?
                // In the original compact view, if a scene is hidden, we might want to gray it out or hide it.
                // But let's assume the sceneCouples logic handles the structure.

                return (
                    <div key={index} className="scene-column compact-scene-column" style={bgStyle}>
                        {/* HEADER */}
                        <div className="compact-scene-couple-header">
                            <div className="header-half" style={{ width: scene2 ? '50%' : '100%', opacity: isSceneVisible(scene1) ? 1 : 0.3 }}>
                                <img className="scene-image" src={config1?.icon} alt={scene1} />
                                <h3>{config1?.name}</h3>
                            </div>
                            {scene2 && (
                                <div className="header-half" style={{ width: '50%', opacity: isSceneVisible(scene2) ? 1 : 0.3 }}>
                                    <img className="scene-image" src={config2?.icon} alt={scene2} />
                                    <h3>{config2?.name}</h3>
                                </div>
                            )}
                        </div>

                        {/* BANDS */}
                        <div className="scene-bands" style={{ height: getSceneBandsHeight() }}>
                            {/* Pas d'heures en mode compact car deux scènes se partagent la colonne */}

                            {/* Groupes Scène 1 */}
                            {isSceneVisible(scene1) && groups1.map(group => (
                                <Band
                                    key={group.id}
                                    group={group}
                                    selectGroup={selectGroup}
                                    selectedGroupId={selectedGroupId}
                                    halfWidth={!!scene2}
                                    side="left"
                                    onTagClick={handleTagClick}
                                />
                            ))}

                            {/* Groupes Scène 2 */}
                            {scene2 && isSceneVisible(scene2) && groups2.map(group => (
                                <Band
                                    key={group.id}
                                    group={group}
                                    selectGroup={selectGroup}
                                    selectedGroupId={selectedGroupId}
                                    halfWidth={true}
                                    side="right"
                                    onTagClick={handleTagClick}
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
        </div>
    );
};

export default DayView;
