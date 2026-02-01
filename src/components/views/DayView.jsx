import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import Band from '../common/Band';
import TagMenu from '../common/TagMenu';

// Composant HourTag (comme dans running-order original)
const HourTag = ({ hour, i }) => (
    <div className='hours' style={{ top: `${(i * 60) - 5}px` }}>
        <span className='hourtags'>{hour}</span>
    </div>
);

const DayView = ({ groups, selectGroup, selectedGroupId, day }) => {
    const { state } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [tagMenuState, setTagMenuState] = useState({ open: false, groupId: null, position: { x: 0, y: 0 } });

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // URLs des images
    const imgSrc = {
        "MAINSTAGE 1": "https://forum.hellfest.fr/uploads/default/original/1X/723469cc76965f666beff04a4024eff673c444f3.png",
        "MAINSTAGE 2": "https://forum.hellfest.fr/uploads/default/original/1X/9ef344af22970ef79d91c1955cd40c2ddaa2b32d.png",
        "WARZONE": "https://forum.hellfest.fr/uploads/default/original/1X/fa9236925f7bd4a4f3b5f622071c425c8b1e04f6.png",
        "VALLEY": "https://forum.hellfest.fr/uploads/default/original/1X/bd43f51c3f066a6d96df719ec826021c0f5a864d.png",
        "ALTAR": "https://forum.hellfest.fr/uploads/default/original/1X/eede00d585209d337e8897aa24cbf0f2255bfdf2.png",
        "TEMPLE": "https://forum.hellfest.fr/uploads/default/original/1X/2f6183017decac3885da317500a664a884eccf84.png",
        // Scènes annexes
        "HELLSTAGE": "/running-order/icons/hellStage.png",
        "PURPLE_HOUSE": "/running-order/icons/purple.png",
        "METAL_CORNER": "/running-order/icons/metalCorner.png"
    };

    // Couleurs des scènes (principales + annexes)
    const sceneColors = {
        "MAINSTAGE 1": '#0055a5',
        "MAINSTAGE 2": '#a6a19b',
        "WARZONE": '#949b1a',
        "VALLEY": '#ce7c19',
        "ALTAR": '#dc2829',
        "TEMPLE": '#93a7b0',
        // Scènes annexes
        "HELLSTAGE": '#239c60',
        "PURPLE_HOUSE": '#9500c6',
        "METAL_CORNER": '#9f9c78'
    };

    // Vérifier si une scène est visible
    const isSceneVisible = (sceneName) => {
        if (!sceneName) return false;
        // Mapper le nom de scène vers l'ID dans state.scenes
        const sceneIdMap = {
            "MAINSTAGE 1": "mainstage1",
            "MAINSTAGE 2": "mainstage2",
            "WARZONE": "warzone",
            "VALLEY": "valley",
            "ALTAR": "altar",
            "TEMPLE": "temple",
            "HELLSTAGE": "hellstage",
            "PURPLE_HOUSE": "purple_house",
            "METAL_CORNER": "metal_corner"
        };
        const sceneId = sceneIdMap[sceneName] || sceneName.toLowerCase().replace(' ', '');
        return state.scenes[sceneId] !== false;
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
            <div className="compact-day extended-view">
                {visibleScenes.map((sceneName, index) => {
                    const sceneGroups = groups.filter(g => g.SCENE === sceneName);
                    const colorValue = sceneColors[sceneName];

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
                                <img className="scene-image" src={imgSrc[sceneName]} alt={sceneName} />
                                <h3>{sceneName}</h3>
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
        <div className="compact-day">
            {sceneCouples.map((sceneCouple, index) => {
                const scene1 = sceneCouple[0];
                const scene2 = sceneCouple[1];

                // Couleurs pour le gradient (logique originale CompactScene.js)
                let colorValue1 = sceneColors[scene1];
                let colorValue2 = scene2 ? sceneColors[scene2] : colorValue1;

                if (!isSceneVisible(scene1)) {
                    colorValue1 = colorValue2;
                }
                // Check visibility only if scene2 exists
                if (scene2 && !isSceneVisible(scene2)) {
                    colorValue2 = colorValue1;
                }

                // Masquer la colonne si les deux scènes sont invisibles
                const bothHidden = !isSceneVisible(scene1) && (!scene2 || !isSceneVisible(scene2));

                // Groupes filtrés pour cette paire de scènes
                const coupleGroups = groups.filter(g => g.SCENE === scene1 || (scene2 && g.SCENE === scene2));

                return (
                    <div
                        key={index}
                        className="scene-column compact-scene-column"
                        style={{
                            background: `linear-gradient(to right, ${colorValue1} 50%, ${colorValue2} 50%)`,
                            display: bothHidden ? 'none' : 'flex',
                            border: 'none'
                        }}
                    >
                        {/* HEADER : 2 divs, chacune avec image + titre */}
                        <div
                            className="compact-scene-couple-header"
                            style={{ display: 'flex', width: '100%' }}
                        >
                            {/* Scène 1 */}
                            <div
                                className="compact-scene-couple-header"
                                style={{
                                    margin: 'auto',
                                    width: '50%',
                                    display: !isSceneVisible(scene1) ? 'none' : 'block'
                                }}
                            >
                                <img className="scene-image" src={imgSrc[scene1]} alt={scene1} />
                                <h3>{scene1}</h3>
                            </div>

                            {/* Scène 2 */}
                            {scene2 && (
                                <div
                                    className="compact-scene-couple-header"
                                    style={{
                                        margin: 'auto',
                                        width: '50%',
                                        display: !isSceneVisible(scene2) ? 'none' : 'block'
                                    }}
                                >
                                    <img
                                        className="scene-image"
                                        src={imgSrc[scene2]}
                                        alt={scene2}
                                        style={{ width: '50%' }}
                                    />
                                    <h3>{scene2}</h3>
                                </div>
                            )}
                        </div>

                        {/* ZONE DES GROUPES */}
                        <div
                            className="scene-bands"
                            style={{ height: getSceneBandsHeight() }}
                        >
                            {coupleGroups.map(group => (
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
};

export default DayView;
