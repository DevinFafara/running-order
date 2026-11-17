import React, { useState, useMemo, useEffect } from 'react';
import chroma from 'chroma-js';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useLineup } from '../../hooks/useLineup'; // Assuming this hook exists or we pass groups as prop
import { STAGE_CONFIG, INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS, CONTEXT_ORDER, DAYS, MAIN_STAGES, SIDE_STAGES } from '../../constants';
import { timeToMinutes } from '../../utils/statsUtils';
import TagMenu from '../common/TagMenu';
import MemberBadges from '../common/MemberBadges';
import { calculateWeeklyLayout } from '../../utils/pdfLayout';
import PDFModal from '../modals/PDFModal';
import DisplayPanel from '../panels/DisplayPanel';
import { markerStroke } from '../../utils/marker';
import { formatMinutes } from '../../utils/time';
import { useFestivalNow } from '../../context/FestivalClockContext';
import './WeeklyView.css';

const START_HOUR = 10; // Start at 10:00
const PIXELS_PER_MINUTE = 0.9; // Adjusted scale as per request

const ICONS = {
    apero: '🍺',
    repas: '🍔',
    dodo: '💤',
    transport: '🚗',
    course: '🛒',
    camping: '⛺',
    ami: '👥',
    autre: '📍'
};

// --- LAYOUT LOGIC MOVED TO UTILS/PDFLAYOUT.JS ---



// Largeur minimale d'une journée (réglage Colonnes) : fixe le nombre de jours par rangée selon l'écran.
// « Compact » = seuils historiques (limite de lisibilité) ; « Moyen » et « Large » imposent une largeur minimale
// plus grande, donc moins de jours côte à côte (largeur max relevée d'autant).
const DAY_WIDTHS = {
    compact: { max: 500, cols: (w) => (w > 1200 ? 4 : w > 800 ? 2 : 1) },
    medium: { max: 650, cols: (w) => Math.max(1, Math.min(DAYS.length, Math.floor((w - 40) / 450))) },
    large: { max: 900, cols: (w) => Math.max(1, Math.min(DAYS.length, Math.floor((w - 40) / 650))) },
};

// Ordre matin/soir de la WeeklyView : réglage propre (weeklyReverse), matin en haut par défaut
const weeklyReverse = (state) => state.weeklyReverse ?? true;

// Valeurs par défaut des filtres (constantes : même référence d'un rendu à l'autre pour les useMemo)
const ALL_WEEKLY_SCENES = [...Object.keys(STAGE_CONFIG), 'CUSTOM'];
const DEFAULT_INTERESTS = ['must_see', 'interested', 'curious'];
const DEFAULT_CONTEXTS = ['with_friend', 'strategic', 'skip'];

const WeeklyCustomEvent = ({ event, onEdit }) => {
    const { state } = useCheckedState();
    const [isMasked, setIsMasked] = useState(false);

    if (typeof event.startTime !== 'string' || typeof event.endTime !== 'string') return null;

    const [startH, startM] = event.startTime.split(':').map(Number);
    const [endH, endM] = event.endTime.split(':').map(Number);
    let sH = startH, eH = endH;
    if (sH < 6) sH += 24;
    if (eH < 6) eH += 24;
    if (eH < sH) eH += 24;

    const start = sH * 60 + startM;
    const end = eH * 60 + endM;
    const height = Math.max(20, (end - start) * PIXELS_PER_MINUTE);
    const originalTop = (start - START_HOUR * 60) * PIXELS_PER_MINUTE;
    const MAX_HEIGHT = 18 * 60 * PIXELS_PER_MINUTE;
    const top = weeklyReverse(state) ? originalTop : MAX_HEIGHT - (originalTop + height);

    return (
        <div
            className="weekly-custom-event"
            title={`${event.title} (${event.startTime} - ${event.endTime})`}
            style={{
                position: 'absolute',
                top: `${top}px`,
                height: `${height}px`,
                left: '2%', width: '96%', zIndex: 50,
                backgroundColor: isMasked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.45)',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
                backdropFilter: isMasked ? 'none' : 'blur(2px)',
                transition: 'all 0.2s',
                overflow: 'hidden',
            }}
        >
            <button
                onClick={(e) => { e.stopPropagation(); setIsMasked(m => !m); }}
                style={{
                    position: 'absolute', left: '4px', pointerEvents: 'auto', zIndex: 51,
                    background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff',
                    borderRadius: '50%', width: '20px', height: '20px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem',
                }}
                title={isMasked ? 'Afficher' : 'Masquer'}
            >
                <i className={isMasked ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', padding: '0 28px', opacity: isMasked ? 0.1 : 1, transition: 'opacity 0.2s', pointerEvents: isMasked ? 'none' : 'auto' }}>
                <span style={{ fontSize: '1.2rem' }}>{ICONS[event.type] || '📍'}</span>
                {height > 25 && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {event.title}
                    </span>
                )}
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(event); }}
                style={{
                    position: 'absolute', right: '4px', pointerEvents: 'auto', zIndex: 51,
                    background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff',
                    borderRadius: '50%', width: '20px', height: '20px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem',
                }}
                title="Modifier"
            >
                <i className="fa-solid fa-pen" />
            </button>
        </div>
    );
};

const WeeklyView = ({ groups, onGroupClick, customEvents = [], onEditCustomEvent, groupRo = null, onExitGroupRo, guestName = null, onExitGuestMode = null }) => {
    const { state, setState, getInterestColor, getBandTag, getUserBandTag, cycleInterest, userState, isGuestMode, stageTheme } = useCheckedState();

    const visibleDays = DAYS; // WeeklyView affiche toujours tous les jours, indépendamment du toggle DayView

    // Préférences d'affichage de la WeeklyView : dans l'état de l'appli (sauvegardé), pas dans la vue
    // qui est démontée à chaque changement de vue. Le setter accepte une valeur ou une fonction, comme useState.
    const prefSetter = (key, fallback) => (value) =>
        setState(prev => ({ ...prev, [key]: typeof value === 'function' ? value(prev[key] ?? fallback) : value }));
    const filterMode = state.weeklyFilterMode ?? 'all'; // 'favorites' | 'all'
    const colorMode = state.weeklyColorMode ?? 'scene'; // 'scene' | 'transparent' (fond sombre) | 'light' (noir sur blanc)
    const selectedScenes = state.weeklyScenes ?? ALL_WEEKLY_SCENES;
    const setSelectedScenes = prefSetter('weeklyScenes', ALL_WEEKLY_SCENES);
    const selectedInterests = state.weeklyInterests ?? DEFAULT_INTERESTS;
    const setSelectedInterests = prefSetter('weeklyInterests', DEFAULT_INTERESTS);
    const selectedContexts = state.weeklyContexts ?? DEFAULT_CONTEXTS;
    const setSelectedContexts = prefSetter('weeklyContexts', DEFAULT_CONTEXTS);
    // Ordre matin/soir propre à la WeeklyView (indépendant de la DayView)
    const reverse = weeklyReverse(state);
    // Heure actuelle (réelle ou simulée) : minutes depuis le début de l'échelle (START_HOUR)
    const { festivalDay, festivalMinutes, isBandPast } = useFestivalNow();
    const nowFromStart = festivalMinutes - START_HOUR * 60;
    // Disposition des favoris : 'optimized' (toute la largeur) | 'grid' (place dans la grille complète des scènes)
    const weeklyLayout = state.weeklyLayout ?? 'optimized';
    // Largeur minimale d'une journée : 'compact' | 'medium' | 'large'
    const dayWidth = state.weeklyDayWidth ?? 'compact';
    const [tagMenuState, setTagMenuState] = useState({ open: false, groupId: null, position: { x: 0, y: 0 } });
    const [dimNonCommon, setDimNonCommon] = useState(false);
    const [highlightMyFavs, setHighlightMyFavs] = useState(false);
    const [showMyFavsInGuest, setShowMyFavsInGuest] = useState(false);

    useEffect(() => { if (!isGuestMode) { setShowMyFavsInGuest(false); setDimNonCommon(false); } }, [isGuestMode]);
    useEffect(() => { setShowMyFavsInGuest(false); setDimNonCommon(false); }, [guestName]);
    // Panneau Affichage (rouage) : position d'ancrage, null = fermé
    const [displayPanelPos, setDisplayPanelPos] = useState(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const dayWidthSpec = DAY_WIDTHS[dayWidth] || DAY_WIDTHS.compact;
    const colCount = dayWidthSpec.cols(windowWidth);

    // Jours ayant potentiellement les 2 types de scènes
    // Switch principales / annexes par jour : seulement si l'édition a des scènes annexes
    const DAYS_WITH_BOTH = SIDE_STAGES.length > 0 ? DAYS : [];
    const [daySceneMode, setDaySceneMode] = useState(
        () => Object.fromEntries(DAYS_WITH_BOTH.map(d => [d, 'main']))
    );
    const toggleDaySceneMode = (day) => setDaySceneMode(prev => ({
        ...prev,
        [day]: prev[day] === 'main' ? 'side' : 'main'
    }));

    // Handle Right Click (Context Menu)
    const handleContextMenu = (e, group) => {
        e.preventDefault();
        e.stopPropagation();

        const menuWidth = 240;
        const menuHeight = 350;
        let x = e.clientX;
        let y = e.clientY;

        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

        setTagMenuState({ open: true, groupId: group.id, position: { x, y } });
    };

    const closeTagMenu = () => {
        setTagMenuState({ open: false, groupId: null, position: { x: 0, y: 0 } });
    };

    // Handle Double Click (Quick Cycle)
    const handleDoubleClick = (e, group) => {
        e.stopPropagation();
        cycleInterest(group.id);
    };

    // Toggle scene visibility
    const toggleScene = (sceneId) => {
        setSelectedScenes(prev =>
            prev.includes(sceneId)
                ? prev.filter(s => s !== sceneId)
                : [...prev, sceneId]
        );
    };

    // Toggle categories
    const toggleInterest = (interestId) => {
        setSelectedInterests(prev =>
            prev.includes(interestId) ? prev.filter(i => i !== interestId) : [...prev, interestId]
        );
    };

    const toggleContext = (contextId) => {
        setSelectedContexts(prev =>
            prev.includes(contextId) ? prev.filter(c => c !== contextId) : [...prev, contextId]
        );
    };

    // Style des favoris (réglage propre à la WeeklyView) ; le projecteur n'estompe rien tant qu'il n'y a aucun favori
    const favoriteStyle = state.weeklyFavoriteStyle || 'spotlight';
    const hasAnyFav = Object.values(userState?.taggedBands || {}).some(t => t?.interest);

    // Filtre de scènes propre à la WeeklyView, piloté depuis l'onglet Filtres du panneau Affichage
    const sceneFilter = {
        isOn: (key) => selectedScenes.includes(key),
        toggle: toggleScene,
        setAll: (on) => setSelectedScenes(on ? ALL_WEEKLY_SCENES : []),
        extras: [{ key: 'CUSTOM', name: 'Créneaux perso', color: '#607D8B' }],
    };

    // --- 0. GROUP RO MAP ---
    const groupTaggedBandsMap = useMemo(() => {
        if (!groupRo) return null;
        const localMemberId = localStorage.getItem('hf_member_id');
        const map = {};
        groupRo.members.forEach(member => {
            // Pour le membre courant, utiliser les tags locaux live (pas les données serveur potentiellement stale)
            const isMe = localMemberId && member.member_id === localMemberId;
            const bands = isMe ? userState.taggedBands : member.taggedBands;
            Object.entries(bands).forEach(([bandId, tag]) => {
                if (!map[bandId]) map[bandId] = [];
                map[bandId].push({ pseudo: member.pseudo, interest: tag.interest || null, context: tag.context || null });
            });
        });
        return map;
    }, [groupRo, userState.taggedBands]);

    // --- 0b. GUEST + ME MAP (mode invité avec "Afficher mes favoris") ---
    const guestTaggedBandsMap = useMemo(() => {
        if (!isGuestMode || !showMyFavsInGuest) return null;
        const map = {};
        const normalize = (tag) => typeof tag === 'string'
            ? { interest: 'must_see', context: null }
            : { interest: tag?.interest || null, context: tag?.context || null };
        // Favoris de l'invité (displayState = guestRo.bands en mode invité)
        Object.entries(state.taggedBands).forEach(([bandId, tag]) => {
            if (!map[bandId]) map[bandId] = [];
            map[bandId].push({ pseudo: guestName, ...normalize(tag) });
        });
        // Favoris de l'utilisateur réel
        Object.entries(userState.taggedBands).forEach(([bandId, tag]) => {
            if (!map[bandId]) map[bandId] = [];
            map[bandId].push({ pseudo: 'Moi', ...normalize(tag) });
        });
        return map;
    }, [isGuestMode, showMyFavsInGuest, state.taggedBands, userState.taggedBands, guestName]);

    const activeTaggedBandsMap = useMemo(
        () => groupTaggedBandsMap || guestTaggedBandsMap,
        [groupTaggedBandsMap, guestTaggedBandsMap]
    );

    // --- 1. FILTERING ---
    const filteredGroups = useMemo(() => {
        if (!groups) return [];
        let selection = groups.filter(g => selectedScenes.includes(g.SCENE));

        if (activeTaggedBandsMap && filterMode === 'favorites') {
            // Mode groupe ou invité+moi en mode "Favoris" : afficher les groupes tagués par au moins un membre
            selection = selection.filter(g => activeTaggedBandsMap[g.id]);
        } else if (!activeTaggedBandsMap && filterMode === 'favorites') {
            // Mode personnel : filtrer par favoris + intérêt/contexte
            selection = selection.filter(g => {
                const tag = getBandTag(g.id);
                if (!tag) return false;
                const interestMatch = tag.interest && selectedInterests.includes(tag.interest);
                const contextMatch = tag.context && selectedContexts.includes(tag.context);
                if (!tag.interest && !tag.context) return true;
                return interestMatch || contextMatch;
            });
        }

        return selection;
    }, [groups, filterMode, state.taggedBands, selectedScenes, selectedInterests, selectedContexts, getBandTag, activeTaggedBandsMap]);

    // --- 2a. ANALYSE FAVORIS — détecte si un jour a des favoris des 2 types ET si c'est critique ---
    const dayFavoritesAnalysis = useMemo(() => {
        if (filterMode !== 'favorites') return {};
        const result = {};
        DAYS_WITH_BOTH.forEach(day => {
            const dayBands = filteredGroups.filter(g => g.DAY === day || g.JOUR === day);
            const sideBands = dayBands.filter(g => SIDE_STAGES.includes(g.SCENE));
            if (sideBands.length === 0) { result[day] = { showSwitch: false }; return; }

            // Le switch n'est nécessaire que si un groupe annexe clashe avec 2+ autres favoris simultanément.
            // Dans ce cas le clashfinder ne peut plus le caser proprement en demi-largeur.
            let maxSideClash = 0;
            sideBands.forEach(b => {
                const s = timeToMinutes(b.DEBUT);
                const rawE = timeToMinutes(b.FIN);
                const e = rawE < s ? rawE + 1440 : rawE;
                const clashCount = dayBands.filter(o => {
                    if (o === b) return false;
                    const os = timeToMinutes(o.DEBUT);
                    const ore = timeToMinutes(o.FIN);
                    const oe = ore < os ? ore + 1440 : ore;
                    return s < oe && e > os;
                }).length;
                if (clashCount > maxSideClash) maxSideClash = clashCount;
            });
            result[day] = { showSwitch: maxSideClash > 1 };
        });
        return result;
    }, [filteredGroups, filterMode, activeTaggedBandsMap]);

    // --- 2b. LAYOUT ALGORITHM (The "Clashfinder" Logic) ---
    // « En grille » (mode Favoris) : les favoris sont placés comme si tous les groupes étaient affichés
    const gridFavorites = filterMode === 'favorites' && weeklyLayout === 'grid';
    const dayColumns = useMemo(() => {
        const columns = {};
        const source = gridFavorites ? (groups || []).filter(g => selectedScenes.includes(g.SCENE)) : filteredGroups;
        const keptIds = gridFavorites ? new Set(filteredGroups.map(g => g.id)) : null;

        DAYS.forEach(day => {
            let dayBands = source.filter(g => g.JOUR === day);
            if (dayBands.length === 0) dayBands = source.filter(g => g.DAY === day);

            // Filtrage par type de scène selon le mode actif pour ce jour
            const needsFilter = DAYS_WITH_BOTH.includes(day) && (
                filterMode === 'all' || gridFavorites ||
                dayFavoritesAnalysis[day]?.showSwitch
            );
            if (needsFilter) {
                const mode = daySceneMode[day] || 'main';
                dayBands = dayBands.filter(g =>
                    mode === 'main' ? MAIN_STAGES.includes(g.SCENE) : SIDE_STAGES.includes(g.SCENE)
                );
            }

            const layout = calculateWeeklyLayout(dayBands, PIXELS_PER_MINUTE, reverse, gridFavorites ? 'all' : filterMode, selectedScenes);
            columns[day] = keptIds ? layout.filter(item => keptIds.has(item.band.id)) : layout;
        });

        return columns;
    }, [groups, filteredGroups, filterMode, gridFavorites, reverse, selectedScenes, daySceneMode, dayFavoritesAnalysis, activeTaggedBandsMap]);

    return (
        <div className="weekly-view">
            {/* En-tête : retour (mode invité / crew) | titre et bascules du mode | actions (PDF, affichage) */}
            <div className="weekly-header">
                <div className="weekly-header-side">
                    {(isGuestMode && guestName) || groupRo ? (
                        <button
                            className="weekly-round-btn"
                            onClick={groupRo ? onExitGroupRo : onExitGuestMode}
                            title={groupRo ? 'Retour à mon RO' : 'Retour'}
                            aria-label={groupRo ? 'Retour à mon RO' : 'Retour'}
                        >
                            <i className="fa-solid fa-chevron-left" />
                        </button>
                    ) : null}
                </div>

                <div className="weekly-header-title">
                    <h2>
                        {groupRo ? (
                            <><i className="fa-solid fa-user-group" style={{ color: '#dc2829' }} />{groupRo.name}</>
                        ) : isGuestMode && guestName ? (
                            <><i className="fa-solid fa-eye" style={{ color: '#FFD700' }} />Semaine de {guestName}</>
                        ) : (
                            'Ma semaine'
                        )}
                    </h2>
                    {groupRo && (
                        <span className="weekly-header-subtitle">
                            {groupRo.members.length} membre{groupRo.members.length > 1 ? 's' : ''} · RO partagé
                        </span>
                    )}
                    {isGuestMode && guestName && !groupRo && (
                        <span className="weekly-header-subtitle">favoris combinés</span>
                    )}

                    {/* Bascules propres au mode crew / invité */}
                    {groupRo && (
                        <div className="weekly-header-toggles">
                            <button
                                className={`weekly-filter-btn ${highlightMyFavs ? 'active' : ''}`}
                                onClick={() => setHighlightMyFavs(v => !v)}
                                title={highlightMyFavs ? 'Afficher tout' : 'Mettre en avant mes favoris'}
                            >
                                <i className="fa-solid fa-star" style={{ marginRight: 5 }} />
                                Mes favoris
                            </button>
                        </div>
                    )}
                    {isGuestMode && (
                        <div className="weekly-header-toggles">
                            <button
                                className={`weekly-filter-btn ${dimNonCommon ? 'active' : ''}`}
                                onClick={() => setDimNonCommon(v => !v)}
                                title={dimNonCommon ? 'Afficher tous les groupes' : 'Réduire les groupes non communs'}
                            >
                                <i className="fa-solid fa-people-arrows" style={{ marginRight: 5 }} />
                                En commun
                            </button>
                            <button
                                className={`weekly-filter-btn ${showMyFavsInGuest ? 'active' : ''}`}
                                onClick={() => setShowMyFavsInGuest(v => !v)}
                                title={showMyFavsInGuest ? 'Masquer mes favoris' : 'Afficher mes favoris'}
                            >
                                <i className="fa-solid fa-star" style={{ marginRight: 5 }} />
                                Mes favoris
                            </button>
                        </div>
                    )}
                </div>

                <div className="weekly-header-side weekly-header-actions">
                    {!isGuestMode && !groupRo && (
                        <button
                            className="weekly-round-btn"
                            onClick={() => setShowPdfModal(true)}
                            title="Exporter en PDF"
                            aria-label="Exporter en PDF"
                        >
                            <i className="fa-solid fa-file-pdf" />
                        </button>
                    )}
                    <button
                        className="weekly-round-btn"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDisplayPanelPos(displayPanelPos ? null : { x: rect.right - 380, y: rect.bottom + 8 });
                        }}
                        title="Affichage"
                        aria-label="Affichage"
                    >
                        <i className="fa-solid fa-gear" />
                        {/* Pastille : nombre de scènes affichées quand certaines sont masquées */}
                        {selectedScenes.length < Object.keys(STAGE_CONFIG).length && (
                            <span className="weekly-round-btn-badge">{selectedScenes.length}</span>
                        )}
                    </button>
                </div>
            </div>

            {(() => {
                const displayedDays = visibleDays.filter(day =>
                    filterMode !== 'favorites' || (dayColumns[day] && dayColumns[day].length > 0)
                );
                const effectiveCols = Math.max(1, Math.min(colCount, displayedDays.length));
                return (<>
                <div className="weekly-grid" style={{
                    gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, ${dayWidthSpec.max}px))`,
                    justifyContent: 'center'
                }}>
                {displayedDays.map((day, dayIdx) => {
                    const isFirstInRow = dayIdx % effectiveCols === 0;
                    // Largeur approximative d'une colonne jour, pour le format condensé
                    const dayColPx = Math.min(dayWidthSpec.max, (windowWidth - 40) / effectiveCols - 10);
                    return (
                    <div
                        key={day}
                        className={`weekly-day-column col-${dayIdx}`}
                        style={{ paddingLeft: isFirstInRow ? '35px' : undefined }}
                    >
                        {/* Time Ruler — affiché uniquement en début de rangée */}
                        <div className="weekly-time-ruler" style={{ display: isFirstInRow ? 'block' : 'none' }}>
                            {Array.from({ length: 18 }).map((_, i) => {
                                const h = START_HOUR + i;
                                const label = h >= 24 ? `${h - 24}h` : `${h}h`;

                                // Calculate position
                                const minutesFromStart = i * 60;
                                const originalTop = minutesFromStart * PIXELS_PER_MINUTE;
                                const TOTAL_MINUTES = 18 * 60;
                                const MAX_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;

                                const top = reverse
                                    ? originalTop
                                    : MAX_HEIGHT - originalTop;

                                return (
                                    <div
                                        key={i}
                                        className="time-marker"
                                        style={{ top: top }}
                                    >
                                        <span>{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="weekly-day-header">
                            <span>{day}</span>
                            {DAYS_WITH_BOTH.includes(day) && (
                                filterMode === 'all' ||
                                dayFavoritesAnalysis[day]?.showSwitch
                            ) && (
                                <button
                                    onClick={() => toggleDaySceneMode(day)}
                                    title={daySceneMode[day] === 'main' ? 'Voir scènes annexes' : 'Voir scènes principales'}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        padding: '2px 8px',
                                        cursor: 'pointer',
                                        fontSize: '0.65rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginLeft: '6px',
                                    }}
                                >
                                    <i className={`fa-solid ${daySceneMode[day] === 'main' ? 'fa-guitar' : 'fa-tent'}`} style={{ fontSize: '0.6rem' }}></i>
                                    <i className="fa-solid fa-right-left" style={{ fontSize: '0.5rem', opacity: 0.6 }}></i>
                                    <i className={`fa-solid ${daySceneMode[day] === 'main' ? 'fa-tent' : 'fa-guitar'}`} style={{ fontSize: '0.6rem' }}></i>
                                </button>
                            )}
                        </div>
                        <div className="weekly-day-content">
                            {/* Repère « maintenant » : colonne du jour en cours, dans l'amplitude affichée */}
                            {festivalDay === day && nowFromStart >= 0 && nowFromStart <= 18 * 60 && (
                                <div
                                    className="now-line"
                                    style={{ top: `${(reverse ? nowFromStart : 18 * 60 - nowFromStart) * PIXELS_PER_MINUTE}px` }}
                                    aria-label={`Heure actuelle : ${formatMinutes(festivalMinutes)}`}
                                >
                                    <span className="now-line-label">{formatMinutes(festivalMinutes)}</span>
                                </div>
                            )}
                            {dayColumns[day].map((item, idx) => {
                                const stageColor = stageTheme[item.band.SCENE]?.themeColor || '#555';
                                const tagData = getBandTag(item.band.id);
                                const isTagged = activeTaggedBandsMap
                                    ? !!activeTaggedBandsMap[item.band.id]
                                    : !!tagData;
                                // Encre de la carte : noire en mode « Noir sur blanc », blanche sinon
                                const ink = colorMode === 'light' ? '#111' : '#fff';
                                const frame = isTagged ? 'none' : (colorMode === 'scene' ? `1px solid ${chroma(stageColor).darken(1.5).hex()}` : colorMode === 'light' ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.1)');
                                const interestColor = !activeTaggedBandsMap && isTagged && tagData.interest
                                    ? getInterestColor(tagData.interest)
                                    : ink;

                                const isOwnFav = !!(userState?.taggedBands?.[item.band.id]);
                                // isCommon = tagué par l'invité ET par l'utilisateur réel
                                const isGuestTagged = isGuestMode ? !!getBandTag(item.band.id) : false;
                                const isCommon = isGuestMode && isGuestTagged && isOwnFav;
                                const dimmed = (isGuestMode && dimNonCommon && !isCommon)
                                    || (groupTaggedBandsMap && highlightMyFavs && !isOwnFav);
                                // Style des favoris (comme la DayView) : étoile, marqueur sur le nom, ou projecteur
                                // (favoris éclairés, autres groupes estompés) — sur le RO de l'utilisateur seulement
                                const ownView = !activeTaggedBandsMap && !isGuestMode;
                                const favInterest = ownView ? tagData?.interest : null;
                                const isMarker = favoriteStyle === 'marker' && !!favInterest;
                                const isSpotlit = favoriteStyle === 'spotlight' && !!favInterest;
                                const spotlightDimmed = ownView && favoriteStyle === 'spotlight' && hasAnyFav && !favInterest;
                                // Option « Estomper les groupes passés » (onglet Colonnes)
                                // Groupe passé : carte entière estompée ; favori passé : fond et texte estompés, mise en avant intacte
                                const isPast = !!state.dimPastBands && isBandPast(item.band);
                                const isPastFav = isPast && isTagged;
                                const isPastOther = isPast && !isTagged;
                                const cardBg = colorMode === 'scene' ? stageColor : colorMode === 'light' ? '#f5f5f5' : '#2a2a2a';
                                const baseShadow = colorMode === 'scene' ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.4)';
                                const cardBoxShadow = isCommon
                                    ? `inset 0 0 0 2px rgba(255,255,255,0.9), 0 0 10px 2px rgba(255,255,255,0.35), ${baseShadow}`
                                    : isSpotlit
                                        ? `inset 0 0 0 2px ${interestColor}, 0 0 10px 1px ${chroma(interestColor).alpha(0.7).css()}, ${baseShadow}`
                                        : baseShadow;

                                // Format condensé sous ~70 px : nom abrégé, horaires masqués (la fiche reste au tap)
                                const cardPx = (item.widthPct / 100) * dayColPx;
                                const condensed = cardPx < 70;
                                const displayName = condensed && cardPx < 46
                                    ? item.band.GROUPE.split(/\s+/).filter(w => !/^(THE|LES|LA|LE)$/.test(w)).map(w => w[0]).join('').slice(0, 3)
                                    : item.band.GROUPE;

                                return (
                                    <div
                                        id={`group-${item.band.id}`}
                                        key={item.band.id}
                                        title={condensed ? `${item.band.GROUPE} · ${item.band.DEBUT}-${item.band.FIN}` : undefined}
                                        className={`weekly-band-card${item.height <= 20 ? ' wb-very-short' : item.height <= 27 ? ' wb-short' : ''}${condensed ? ' wb-condensed' : ''}`}
                                        style={{
                                            top: item.top,
                                            height: item.height,
                                            left: `${item.leftPct}%`,
                                            width: `${item.widthPct}%`,
                                            backgroundColor: isPastFav ? chroma(cardBg).desaturate(1.5).alpha(0.45).css() : cardBg,
                                            // Bordures en propriétés séparées : un `border` raccourci écraserait le liseré gauche lors des mises à jour
                                            borderTop: frame,
                                            borderRight: frame,
                                            borderBottom: frame,
                                            borderLeft: `4px solid ${colorMode === 'scene' ? chroma(stageColor).darken(1.5).hex() : stageColor}`,
                                            color: isPastFav ? chroma(ink).alpha(0.45).css() : ink,
                                            boxShadow: cardBoxShadow,
                                            opacity: (dimmed ? 0.2 : spotlightDimmed ? 0.38 : 1) * (isPastOther ? 0.45 : 1),
                                            ...(isPastOther ? { filter: 'grayscale(0.7)' } : {}),
                                            transition: 'opacity 0.2s',
                                        }}
                                        onClick={() => onGroupClick(item.band)}
                                        onContextMenu={(e) => handleContextMenu(e, item.band)}
                                        onDoubleClick={(e) => handleDoubleClick(e, item.band)}
                                    // title={`${item.band.GROUPE} (${item.band.SCENE})`} // Disabled as per user request
                                    >
                                        <div className="weekly-band-content">
                                            <div className="weekly-band-name">
                                                {isMarker
                                                    ? <span className="band-name-marker" style={{ backgroundImage: markerStroke(interestColor) }}>{displayName}</span>
                                                    : displayName}
                                            </div>
                                            {!condensed && (
                                                <div className="weekly-band-info">
                                                    <span>{item.band.DEBUT}-{item.band.FIN}</span>
                                                </div>
                                            )}
                                            {groupTaggedBandsMap ? (
                                                groupTaggedBandsMap[item.band.id] && (
                                                    <MemberBadges taggers={groupTaggedBandsMap[item.band.id]} />
                                                )
                                            ) : guestTaggedBandsMap ? (
                                                guestTaggedBandsMap[item.band.id] && (
                                                    <MemberBadges taggers={guestTaggedBandsMap[item.band.id]} />
                                                )
                                            ) : isGuestMode ? (() => {
                                                const ownTag = getUserBandTag(item.band.id);
                                                return (<>
                                                    {tagData && (
                                                        <MemberBadges taggers={[{ pseudo: guestName, interest: tagData.interest, context: tagData.context }]} />
                                                    )}
                                                    {ownTag && (
                                                        <div style={{ color: ownTag.interest ? getInterestColor(ownTag.interest) : ink, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                            {ownTag.interest && <i className="fa-solid fa-star" style={{ fontSize: '0.7rem' }} />}
                                                            {ownTag.context && <span style={{ fontSize: '0.7rem' }}>{CONTEXT_TAGS[ownTag.context]?.icon}</span>}
                                                        </div>
                                                    )}
                                                </>);
                                            })() : (
                                                isTagged && (
                                                    <div style={{ color: interestColor, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        {tagData.interest && !isMarker && !isSpotlit && <i className="fa-solid fa-star" style={{ fontSize: '0.7rem' }} />}
                                                        {tagData.context && <span style={{ fontSize: '0.7rem' }}>{CONTEXT_TAGS[tagData.context]?.icon}</span>}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* CUSTOM EVENTS LAYER (Filtered) */}
                            {selectedScenes.includes('CUSTOM') && (customEvents || []).filter(e => e.day === day).map(event => (
                                <WeeklyCustomEvent key={event.id} event={event} onEdit={onEditCustomEvent} />
                            ))}
                        </div>
                    </div>
                );
                })}
                </div>
                {displayedDays.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#555', padding: '60px 20px', fontSize: '1rem', fontStyle: 'italic' }}>
                        {groupRo
                            ? 'Aucun groupe mis en favori par les membres du crew.'
                            : 'Aucun groupe mis en favori.'}
                    </div>
                )}
                </>);
            })()}

            {tagMenuState.open && (
                <TagMenu
                    groupId={tagMenuState.groupId}
                    position={tagMenuState.position}
                    onClose={closeTagMenu}
                />
            )}

            {displayPanelPos && (
                <div className="group-card-container">
                    <DisplayPanel
                        view="weekly"
                        position={displayPanelPos}
                        onClose={() => setDisplayPanelPos(null)}
                        sceneFilter={sceneFilter}
                        weeklyOptions={{
                            filterMode, colorMode, layout: weeklyLayout, dayWidth, reverse,
                            selectedInterests, selectedContexts, toggleInterest, toggleContext,
                            set: (key, value) => setState(prev => ({ ...prev, [key]: value })),
                        }}
                    />
                </div>
            )}

            {showPdfModal && (
                <PDFModal
                    onClose={() => setShowPdfModal(false)}
                    groups={groups}
                    customEvents={customEvents}
                    selectedScenes={selectedScenes}
                    colorMode={colorMode}
                    taggedBands={state.taggedBands}
                    reverse={reverse}
                />
            )}
        </div>
    );
};

export default WeeklyView;
