import React, { useState, useMemo, useRef, useEffect } from 'react';
import chroma from 'chroma-js';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useLineup } from '../../hooks/useLineup'; // Assuming this hook exists or we pass groups as prop
import { STAGE_CONFIG, INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS, CONTEXT_ORDER, DAYS, MAIN_STAGES, SIDE_STAGES } from '../../constants';
import { timeToMinutes } from '../../utils/statsUtils';
import TagMenu from '../common/TagMenu';
import { calculateWeeklyLayout } from '../../utils/pdfLayout';
import PDFModal from '../modals/PDFModal';
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

const INTEREST_DEFAULT_COLORS = {
    must_see: '#e91e8c',
    interested: '#1e88e5',
    curious: '#43a047',
};

const MemberBadges = ({ taggers }) => {
    const MAX_VISIBLE = 3;
    const visible = taggers.slice(0, MAX_VISIBLE);
    const extra = taggers.length - MAX_VISIBLE;
    return (
        <div className="weekly-member-badges">
            {visible.map((t, i) => (
                <span
                    key={t.pseudo + i}
                    className="weekly-member-badge"
                    style={{ backgroundColor: t.interest ? (INTEREST_DEFAULT_COLORS[t.interest] || '#888') : '#555' }}
                    title={`${t.pseudo}${t.interest ? ` · ${t.interest}` : ''}${t.context ? ` · ${t.context}` : ''}`}
                >
                    {t.pseudo.slice(0, 2).toUpperCase()}
                </span>
            ))}
            {extra > 0 && (
                <span className="weekly-member-badge weekly-member-badge--extra">+{extra}</span>
            )}
        </div>
    );
};

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
    const top = state.reverse ? originalTop : MAX_HEIGHT - (originalTop + height);

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

const WeeklyView = ({ groups, onGroupClick, customEvents = [], onEditCustomEvent, groupRo = null, onExitGroupRo }) => {
    const { state, getInterestColor, getBandTag, cycleInterest, userState, isGuestMode } = useCheckedState();

    const visibleDays = DAYS; // WeeklyView affiche toujours tous les jours, indépendamment du toggle DayView

    const [filterMode, setFilterMode] = useState('favorites'); // 'favorites' or 'all'
    const [colorMode, setColorMode] = useState('scene'); // 'transparent' or 'scene'
    const [selectedScenes, setSelectedScenes] = useState(() => [...Object.keys(STAGE_CONFIG), 'CUSTOM']);
    const [selectedInterests, setSelectedInterests] = useState(['must_see', 'interested', 'curious']);
    const [selectedContexts, setSelectedContexts] = useState(['with_friend', 'strategic', 'skip']);
    const [tagMenuState, setTagMenuState] = useState({ open: false, groupId: null, position: { x: 0, y: 0 } });
    const [dimNonCommon, setDimNonCommon] = useState(false);
    const [highlightMyFavs, setHighlightMyFavs] = useState(false);
    const [showSceneDropdown, setShowSceneDropdown] = useState(false);
    const sceneDropdownRef = useRef(null);

    useEffect(() => {
        if (!showSceneDropdown) return;
        const close = (e) => {
            if (!sceneDropdownRef.current?.contains(e.target)) setShowSceneDropdown(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [showSceneDropdown]);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const getDefaultColCount = (width) => {
        if (width > 1600) return 6;
        if (width > 1200) return 3;
        if (width > 800) return 2;
        return 1;
    };
    const [colCount, setColCount] = useState(() => getDefaultColCount(window.innerWidth));

    React.useEffect(() => {
        const handleResize = () => setColCount(getDefaultColCount(window.innerWidth));
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Jours ayant potentiellement les 2 types de scènes
    const DAYS_WITH_BOTH = ['Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
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

    // Toggle All Scenes
    const toggleAllScenes = () => {
        const allKeys = [...Object.keys(STAGE_CONFIG), 'CUSTOM'];
        if (selectedScenes.length >= Object.keys(STAGE_CONFIG).length) { // Loose check: if mostly full, clear all
            if (selectedScenes.length === allKeys.length) setSelectedScenes([]);
            else setSelectedScenes(allKeys);
        } else {
            setSelectedScenes(allKeys);
        }
    };

    // --- 0. GROUP RO MAP ---
    const groupTaggedBandsMap = useMemo(() => {
        if (!groupRo) return null;
        const map = {};
        groupRo.members.forEach(member => {
            Object.entries(member.taggedBands).forEach(([bandId, tag]) => {
                if (!map[bandId]) map[bandId] = [];
                map[bandId].push({ pseudo: member.pseudo, interest: tag.interest || null, context: tag.context || null });
            });
        });
        return map;
    }, [groupRo]);

    // --- 1. FILTERING ---
    const filteredGroups = useMemo(() => {
        if (!groups) return [];
        let selection = groups.filter(g => selectedScenes.includes(g.SCENE));

        if (groupTaggedBandsMap) {
            // Mode groupe : afficher les groupes tagués par au moins un membre
            selection = selection.filter(g => groupTaggedBandsMap[g.id]);
        } else if (filterMode === 'favorites') {
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
    }, [groups, filterMode, state.taggedBands, selectedScenes, selectedInterests, selectedContexts, getBandTag, groupTaggedBandsMap]);

    // --- 2a. ANALYSE FAVORIS — détecte si un jour a des favoris des 2 types ET si c'est critique ---
    const dayFavoritesAnalysis = useMemo(() => {
        if (!groupTaggedBandsMap && filterMode !== 'favorites') return {};
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
    }, [filteredGroups, filterMode, groupTaggedBandsMap]);

    // --- 2b. LAYOUT ALGORITHM (The "Clashfinder" Logic) ---
    const dayColumns = useMemo(() => {
        const columns = {};

        DAYS.forEach(day => {
            let dayBands = filteredGroups.filter(g => g.JOUR === day);
            if (dayBands.length === 0) dayBands = filteredGroups.filter(g => g.DAY === day);

            // Filtrage par type de scène selon le mode actif pour ce jour
            const needsFilter = DAYS_WITH_BOTH.includes(day) && (
                (!groupTaggedBandsMap && filterMode === 'all') ||
                dayFavoritesAnalysis[day]?.showSwitch
            );
            if (needsFilter) {
                const mode = daySceneMode[day] || 'main';
                dayBands = dayBands.filter(g =>
                    mode === 'main' ? MAIN_STAGES.includes(g.SCENE) : SIDE_STAGES.includes(g.SCENE)
                );
            }

            columns[day] = calculateWeeklyLayout(dayBands, PIXELS_PER_MINUTE, state.reverse, filterMode, selectedScenes);
        });

        return columns;
    }, [filteredGroups, filterMode, state.reverse, selectedScenes, daySceneMode, dayFavoritesAnalysis, groupTaggedBandsMap]);

    return (
        <div className="weekly-view">
            <div className="weekly-header">
                {/* Left: Title */}
                <div className="weekly-header-left">
                    {groupRo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                                onClick={onExitGroupRo}
                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                                title="Retour à mon RO"
                            >
                                <i className="fa-solid fa-chevron-left" />
                            </button>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1rem' }}>
                                    <i className="fa-solid fa-user-group" style={{ marginRight: 8, color: '#dc2829' }} />
                                    {groupRo.name}
                                </h2>
                                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: 2 }}>
                                    {groupRo.members.length} membre{groupRo.members.length > 1 ? 's' : ''} · favoris combinés
                                </div>
                            </div>
                            <button
                                onClick={() => setHighlightMyFavs(v => !v)}
                                title={highlightMyFavs ? 'Afficher tout' : 'Mettre en avant mes favoris'}
                                style={{
                                    marginLeft: 4,
                                    background: highlightMyFavs ? '#dc2829' : 'rgba(255,255,255,0.08)',
                                    border: `1px solid ${highlightMyFavs ? '#dc2829' : 'rgba(255,255,255,0.2)'}`,
                                    borderRadius: 12,
                                    color: 'white',
                                    padding: '3px 10px',
                                    cursor: 'pointer',
                                    fontSize: '0.72rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                }}
                            >
                                <i className="fa-solid fa-star" style={{ fontSize: '0.65rem' }} />
                                Mes favoris
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <h2>Résumé Semaine</h2>
                            <button
                                className="export-pdf-btn"
                                onClick={() => setShowPdfModal(true)}
                            >
                                <i className="fa-solid fa-file-pdf"></i>
                                <span>PDF</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Center: Scene Filters Dropdown */}
                <div className="weekly-header-center" style={{ position: 'relative' }} ref={sceneDropdownRef}>
                    <div className="weekly-filter-btn" style={{ display: 'flex', alignItems: 'center', padding: 0, overflow: 'hidden', gap: 0 }}>
                        <button
                            onClick={toggleAllScenes}
                            title={selectedScenes.length >= Object.keys(STAGE_CONFIG).length ? 'Tout masquer' : 'Tout afficher'}
                            style={{ background: 'none', border: 'none', borderRight: '1px solid #555', color: 'inherit', cursor: 'pointer', padding: '5px 10px', display: 'flex', alignItems: 'center' }}
                        >
                            <i className={`fa-solid ${selectedScenes.length >= Object.keys(STAGE_CONFIG).length ? 'fa-eye-slash' : 'fa-eye'}`} />
                        </button>
                        <button
                            onClick={() => setShowSceneDropdown(v => !v)}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                            title="Filtrer les scènes"
                        >
                            Scènes
                            {selectedScenes.length < Object.keys(STAGE_CONFIG).length && (
                                <span style={{ background: '#e74c3c', borderRadius: '10px', fontSize: '0.75em', padding: '1px 6px', color: 'white' }}>
                                    {selectedScenes.length}
                                </span>
                            )}
                            <i className={`fa-solid fa-chevron-${showSceneDropdown ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', opacity: 0.6 }} />
                        </button>
                    </div>

                    {showSceneDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#1e1e1e',
                            border: '1px solid #333',
                            borderRadius: '10px',
                            padding: '10px',
                            zIndex: 200,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                        }}>
                            {/* Rangée 1 : scènes principales */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {MAIN_STAGES.map(key => {
                                    const config = STAGE_CONFIG[key];
                                    return (
                                        <button key={key} className={`scene-filter-tiny-btn ${selectedScenes.includes(key) ? 'active' : ''}`}
                                            onClick={() => toggleScene(key)}
                                            style={{ '--scene-color': config.themeColor, opacity: selectedScenes.includes(key) ? 1 : 0.4 }}
                                            title={config.name}
                                        >
                                            <img src={config.icon} alt={config.name} className="mini-icon" />
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Rangée 2 : scènes annexes */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {SIDE_STAGES.map(key => {
                                    const config = STAGE_CONFIG[key];
                                    return (
                                        <button key={key} className={`scene-filter-tiny-btn ${selectedScenes.includes(key) ? 'active' : ''}`}
                                            onClick={() => toggleScene(key)}
                                            style={{ '--scene-color': config.themeColor, opacity: selectedScenes.includes(key) ? 1 : 0.4 }}
                                            title={config.name}
                                        >
                                            <img src={config.icon} alt={config.name} className="mini-icon" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: View Mode Filters */}
                <div className="weekly-header-right">
                    <div className="weekly-filters">
                        <button
                            className={`weekly-filter-btn ${filterMode === 'favorites' ? 'active' : ''}`}
                            onClick={() => setFilterMode('favorites')}
                        >
                            Les Favoris
                        </button>
                        <button
                            className={`weekly-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterMode('all')}
                        >
                            Tout le monde
                        </button>
                    </div>
                    <div className="weekly-filters">
                        <button
                            className={`weekly-filter-btn ${colorMode === 'transparent' ? 'active' : ''}`}
                            onClick={() => setColorMode('transparent')}
                        >
                            Transparent
                        </button>
                        <button
                            className={`weekly-filter-btn ${colorMode === 'scene' ? 'active' : ''}`}
                            onClick={() => setColorMode('scene')}
                        >
                            Couleurs Scènes
                        </button>
                    </div>

                    {isGuestMode && (
                        <div className="weekly-filters">
                            <button
                                className={`weekly-filter-btn ${dimNonCommon ? 'active' : ''}`}
                                onClick={() => setDimNonCommon(v => !v)}
                                title={dimNonCommon ? 'Afficher tous les groupes' : 'Réduire les groupes non communs'}
                            >
                                <i className="fa-solid fa-people-arrows" style={{ marginRight: 5 }} />
                                En commun
                            </button>
                        </div>
                    )}

                    {filterMode === 'favorites' && (
                        <div className="weekly-filters-categories">
                            {INTEREST_ORDER.map(levelId => {
                                const level = INTEREST_LEVELS[levelId];
                                const isActive = selectedInterests.includes(levelId);
                                return (
                                    <button
                                        key={levelId}
                                        className={`interest-filter-btn ${isActive ? 'active' : ''}`}
                                        onClick={() => toggleInterest(levelId)}
                                        style={{ 
                                            '--level-color': getInterestColor(levelId),
                                            opacity: isActive ? 1 : 0.4 
                                        }}
                                        title={level.label}
                                    >
                                        <i className="fa-solid fa-star"></i>
                                    </button>
                                );
                            })}
                            <div className="weekly-filters-separator-small" />
                            {CONTEXT_ORDER.map(tagId => {
                                const tag = CONTEXT_TAGS[tagId];
                                const isActive = selectedContexts.includes(tagId);
                                return (
                                    <button
                                        key={tagId}
                                        className={`context-filter-btn ${isActive ? 'active' : ''}`}
                                        onClick={() => toggleContext(tagId)}
                                        style={{ opacity: isActive ? 1 : 0.4 }}
                                        title={tag.label}
                                    >
                                        <span style={{ fontSize: '1.1rem' }}>{tag.icon}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {(() => {
                const displayedDays = visibleDays.filter(day =>
                    filterMode !== 'favorites' || (dayColumns[day] && dayColumns[day].length > 0)
                );
                const effectiveCols = Math.max(1, Math.min(colCount, displayedDays.length));
                return (<>
                <div className="weekly-grid" style={{
                    gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 500px))`,
                    justifyContent: 'center'
                }}>
                {displayedDays.map((day, dayIdx) => {
                    const isFirstInRow = dayIdx % effectiveCols === 0;
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

                                const top = state.reverse
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
                                (!groupTaggedBandsMap && filterMode === 'all') ||
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
                            {dayColumns[day].map((item, idx) => {
                                const stageColor = STAGE_CONFIG[item.band.SCENE]?.themeColor || '#555';
                                const tagData = getBandTag(item.band.id);
                                const isTagged = groupTaggedBandsMap
                                    ? !!groupTaggedBandsMap[item.band.id]
                                    : !!tagData;
                                const interestColor = !groupTaggedBandsMap && isTagged && tagData.interest
                                    ? getInterestColor(tagData.interest)
                                    : 'white';

                                const isOwnFav = !!(userState?.taggedBands?.[item.band.id]);
                                const isCommon = isGuestMode && isTagged && isOwnFav;
                                const dimmed = (isGuestMode && dimNonCommon && !isCommon)
                                    || (groupTaggedBandsMap && highlightMyFavs && !isOwnFav);
                                const baseShadow = colorMode === 'scene' ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.4)';
                                const cardBoxShadow = isCommon
                                    ? `inset 0 0 0 2px rgba(255,255,255,0.9), 0 0 10px 2px rgba(255,255,255,0.35), ${baseShadow}`
                                    : baseShadow;

                                return (
                                    <div
                                        id={`group-${item.band.id}`}
                                        key={item.band.id}
                                        className={`weekly-band-card${item.height <= 20 ? ' wb-very-short' : item.height <= 27 ? ' wb-short' : ''}`}
                                        style={{
                                            top: item.top,
                                            height: item.height,
                                            left: `${item.leftPct}%`,
                                            width: `${item.widthPct}%`,
                                            backgroundColor: colorMode === 'scene' ? stageColor : '#2a2a2a',
                                            border: isTagged ? '0px solid white' : (colorMode === 'scene' ? `1px solid ${chroma(stageColor).darken(1.5).hex()}` : '1px solid rgba(255,255,255,0.1)'),
                                            borderLeft: `4px solid ${colorMode === 'scene' ? chroma(stageColor).darken(1.5).hex() : stageColor}`,
                                            color: '#fff',
                                            boxShadow: cardBoxShadow,
                                            opacity: dimmed ? 0.2 : 1,
                                            transition: 'opacity 0.2s',
                                        }}
                                        onClick={() => onGroupClick(item.band)}
                                        onContextMenu={(e) => handleContextMenu(e, item.band)}
                                        onDoubleClick={(e) => handleDoubleClick(e, item.band)}
                                    // title={`${item.band.GROUPE} (${item.band.SCENE})`} // Disabled as per user request
                                    >
                                        <div className="weekly-band-content">
                                            <div className="weekly-band-name">{item.band.GROUPE}</div>
                                            <div className="weekly-band-info">
                                                <span>{item.band.DEBUT}-{item.band.FIN}</span>
                                            </div>
                                            {groupTaggedBandsMap ? (
                                                groupTaggedBandsMap[item.band.id] && (
                                                    <MemberBadges taggers={groupTaggedBandsMap[item.band.id]} />
                                                )
                                            ) : (
                                                isTagged && (
                                                    <div
                                                        className="weekly-band-tag-indicator"
                                                        style={{ color: interestColor }}
                                                    >
                                                        {tagData.interest ? (
                                                            <i className="fa-solid fa-star" style={{ fontSize: '0.7rem' }}></i>
                                                        ) : (
                                                            <span style={{ fontSize: '0.7rem' }}>{CONTEXT_TAGS[tagData.context]?.icon}</span>
                                                        )}
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
                            ? 'Aucun groupe mis en favori par les membres du groupe.'
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

            {showPdfModal && (
                <PDFModal
                    onClose={() => setShowPdfModal(false)}
                    groups={groups}
                    customEvents={customEvents}
                    selectedScenes={selectedScenes}
                    colorMode={colorMode}
                    taggedBands={state.taggedBands}
                    reverse={state.reverse}
                />
            )}
        </div>
    );
};

export default WeeklyView;
