import React, { useState, useMemo } from 'react';
import chroma from 'chroma-js';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useLineup } from '../../hooks/useLineup'; // Assuming this hook exists or we pass groups as prop
import { STAGE_CONFIG, INTEREST_LEVELS } from '../../constants';
// Reuse timeToMinutes for layout calcs
import { timeToMinutes } from '../../utils/statsUtils';
import TagMenu from '../common/TagMenu';
import './WeeklyView.css';

const START_HOUR = 10; // Start at 10:00
const PIXELS_PER_MINUTE = 0.9; // Adjusted scale as per request

// --- LEGACY LAYOUT CONSTANTS (V6.1.5) ---
const SCENE_COUPLES = {
    'MAINSTAGE 1': 'MS', 'MAINSTAGE 2': 'MS',
    'WARZONE': 'WV', 'VALLEY': 'WV',
    'ALTAR': 'AT', 'TEMPLE': 'AT',
    'HELLSTAGE': 'HM', 'METAL_CORNER': 'HM',
    'PURPLE_HOUSE': 'PH'
};
const SCENE_ORDER = ['MS', 'WV', 'AT', 'HM', 'PH'];

// --- ALGORITHM: SANDWICH LAYOUT (V6.1.5) ---
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

const calculateFavoritesLayout = (groupsToLayout) => {
    if (!groupsToLayout || groupsToLayout.length === 0) return [];

    // 1. Pre-process: Time Points & Couples
    const timePoints = new Set();
    groupsToLayout.forEach(g => {
        g.sceneCouple = SCENE_COUPLES[g.SCENE] || 'UNKNOWN';
        g._start = timeToMinutes(g.DEBUT);
        g._end = timeToMinutes(g.FIN);
        g._duration = g._end - g._start;
        timePoints.add(g._start);
        timePoints.add(g._end);
    });
    const sortedTimePoints = [...timePoints].sort((a, b) => a - b);

    // 2. Pass 1: Max Simultaneous Context
    groupsToLayout.forEach(g => {
        g.maxSimCols = 0;
        g.maxSimContext = [];

        for (let i = 0; i < sortedTimePoints.length - 1; i++) {
            const intervalStart = sortedTimePoints[i];
            const intervalEnd = sortedTimePoints[i + 1];
            if (intervalStart === intervalEnd) continue;

            if (g._start < intervalEnd && g._end > intervalStart) {
                const couplesInInterval = new Set([g.sceneCouple]);
                groupsToLayout.forEach(other => {
                    if (g === other) return;
                    if (other._start < intervalEnd && other._end > intervalStart) {
                        couplesInInterval.add(other.sceneCouple);
                    }
                });

                if (couplesInInterval.size > g.maxSimCols) {
                    g.maxSimCols = couplesInInterval.size;
                    g.maxSimContext = [...couplesInInterval].sort((a, b) => SCENE_ORDER.indexOf(a) - SCENE_ORDER.indexOf(b));
                }
            }
        }
        // Fallback
        if (g.maxSimCols === 0) {
            g.maxSimCols = 1;
            g.maxSimContext = [g.sceneCouple];
        }
    });

    // 3. Pass 2: Sandwich Detection (Strict Overlap)
    const doTimesOverlap = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

    groupsToLayout.forEach(g => {
        g.isSandwiched = false;
        g.sandwichedContext = [];
        g.sandwichedCols = 0;

        const g_sc_index = SCENE_ORDER.indexOf(g.sceneCouple);
        const leftPartners = new Set();
        const rightPartners = new Set();

        groupsToLayout.forEach(other => {
            if (g === other) return;
            if (doTimesOverlap(g._start, g._end, other._start, other._end)) {
                const other_sc_index = SCENE_ORDER.indexOf(other.sceneCouple);
                if (other_sc_index < g_sc_index) leftPartners.add(other.sceneCouple);
                else if (other_sc_index > g_sc_index) rightPartners.add(other.sceneCouple);
            }
        });

        if (leftPartners.size > 0 && rightPartners.size > 0) {
            g.isSandwiched = true;
            const fullSet = new Set([g.sceneCouple, ...leftPartners, ...rightPartners]);
            g.sandwichedContext = [...fullSet].sort((a, b) => SCENE_ORDER.indexOf(a) - SCENE_ORDER.indexOf(b));
            g.sandwichedCols = g.sandwichedContext.length;
        }
    });

    // 4. Pass 3: Selection (Sandwich vs MaxSim)
    groupsToLayout.forEach(g => {
        if (g.isSandwiched && g.sandwichedCols > g.maxSimCols) {
            g.finalContext = [...g.sandwichedContext];
            g.finalNumCols = g.sandwichedCols;
        } else {
            g.finalContext = [...g.maxSimContext];
            g.finalNumCols = g.maxSimCols;
        }
    });

    // 5. Pass 4: Propagation (The Wave)
    let changed = true;
    let iter = 0;
    while (changed && iter < 10) {
        changed = false;
        iter++;
        groupsToLayout.forEach(g1 => {
            groupsToLayout.forEach(g2 => {
                if (g1 === g2) return;
                if (doTimesOverlap(g1._start, g1._end, g2._start, g2._end)) {
                    // If one context contains the other's couple, try to unify
                    if (g1.finalContext.includes(g2.sceneCouple)) {
                        // Propagate larger context or same size but different content
                        if (g1.finalNumCols > g2.finalNumCols ||
                            (g1.finalNumCols === g2.finalNumCols && g1.finalContext.join(',') !== g2.finalContext.join(','))) {
                            g2.finalContext = [...g1.finalContext];
                            g2.finalNumCols = g1.finalNumCols;
                            changed = true;
                        }
                    }
                }
            });
        });
    }

    // 6. Final Calculation
    return groupsToLayout.map(g => {
        // Determine Position Index from SCENE_ORDER in the Context
        let posIndex = g.finalContext.indexOf(g.sceneCouple);

        // Safety fallback if context got corrupted or logic failed
        if (posIndex === -1) {
            g.finalContext.sort((a, b) => SCENE_ORDER.indexOf(a) - SCENE_ORDER.indexOf(b));
            posIndex = g.finalContext.indexOf(g.sceneCouple);
        }
        if (posIndex === -1) posIndex = 0;

        const totalCols = Math.max(1, g.finalNumCols);
        let widthPct = 100 / totalCols;

        // Apply User's Strict 50% Limit
        widthPct = Math.min(widthPct, 50);

        // Centering Logic
        const usedWidth = widthPct * totalCols;
        const remainingWidth = Math.max(0, 100 - usedWidth);
        const shiftRight = remainingWidth / 2;

        const leftPct = (posIndex * widthPct) + shiftRight;

        return {
            band: g,
            start: g._start,
            end: g._end,
            widthPct,
            leftPct,
        };
    });
};

const WeeklyView = ({ groups, onGroupClick, customEvents = [], onEditCustomEvent }) => {
    const { state, getInterestColor, getBandTag, cycleInterest } = useCheckedState();
    const [filterMode, setFilterMode] = useState('favorites'); // 'favorites' or 'all'
    const [colorMode, setColorMode] = useState('transparent'); // 'transparent' or 'scene'
    const [selectedScenes, setSelectedScenes] = useState(() => [...Object.keys(STAGE_CONFIG), 'CUSTOM']);
    const [tagMenuState, setTagMenuState] = useState({ open: false, groupId: null, position: { x: 0, y: 0 } });

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

    // --- 1. FILTERING ---
    const filteredGroups = useMemo(() => {
        if (!groups) return [];
        let selection = groups.filter(g => selectedScenes.includes(g.SCENE));

        // If 'favorites' mode, keep only tagged bands
        if (filterMode === 'favorites') {
            selection = selection.filter(g => state.taggedBands[g.id]);
        }

        return selection;
    }, [groups, filterMode, state.taggedBands, selectedScenes]);

    // --- 2. LAYOUT ALGORITHM (The "Clashfinder" Logic) ---
    const dayColumns = useMemo(() => {
        const days = ['Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const columns = {};

        // Structured Layout for "Tout le monde"
        // Use KEYS from STAGES constant to match selectedScenes
        const SCENE_GROUPS = [
            ['MAINSTAGE 1', 'MAINSTAGE 2'],
            ['WARZONE', 'VALLEY'],
            ['ALTAR', 'TEMPLE'],
            ['HELLSTAGE', 'METAL_CORNER'],
            ['PURPLE_HOUSE']
        ];

        days.forEach(day => {
            let dayBands = filteredGroups.filter(g => g.DAY === day);
            const positionedBands = [];

            // Sort Logic: Time based, respectful of Global Reverse setting
            const sortBands = (bands, sceneGroup = []) => {
                bands.sort((a, b) => {
                    // 1. Scene Priority (Index in grid pair)
                    if (sceneGroup.length > 0 && a.SCENE !== b.SCENE) {
                        const idxA = sceneGroup.indexOf(a.SCENE);
                        const idxB = sceneGroup.indexOf(b.SCENE);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    }

                    const startA = timeToMinutes(a.DEBUT);
                    const startB = timeToMinutes(b.DEBUT);

                    // Primary sort: Start time
                    if (startA !== startB) {
                        return state.reverse ? startA - startB : startB - startA;
                    }

                    // Secondary sort: Duration (Longer first if same start?) or End time
                    // Standard logic usually puts longer events first to optimize packing, 
                    // but for visual list sorting, usually purely chronological.
                    return 0;
                });
            };

            if (filterMode === 'all') {
                // --- STRATEGY B: DYNAMIC COLUMNS ---
                // 1. Identify which scene groups are "active" (at least one scene in the pair is selected)
                const activeSceneGroups = SCENE_GROUPS.filter(group =>
                    group.some(sceneKey => selectedScenes.includes(sceneKey))
                );

                const totalActiveCols = activeSceneGroups.length;
                const COLUMN_WIDTH_PCT = totalActiveCols > 0 ? (100 / totalActiveCols) : 0;

                // Process each ACTIVE column group independently
                activeSceneGroups.forEach((sceneGroup, groupColIndex) => {
                    // Filter bands for this specific column
                    // Matches if band's SCENE (Key) is in the sceneGroup (Keys)
                    const colBands = dayBands.filter(b => sceneGroup.includes(b.SCENE));

                    // Apply Sort: Pass sceneGroup to respect MS1 > MS2 order
                    sortBands(colBands, sceneGroup);

                    // Simple clash logic for WITHIN this column
                    const localPositioned = [];

                    colBands.forEach(band => {
                        const start = timeToMinutes(band.DEBUT);
                        const end = timeToMinutes(band.FIN);
                        const duration = end - start;
                        // Define height FIRST because inverted top depends on it
                        const height = Math.max(20, duration * PIXELS_PER_MINUTE);

                        // STANDARD vertical assignment
                        const originalTop = (start - (START_HOUR * 60)) * PIXELS_PER_MINUTE;

                        // If reverse, flip axis: 
                        // Total Height = (24 + 2 - 10) * 60 * 0.8? 
                        // Actually the ruler goes from 10h to 04h (18h range).
                        const TOTAL_MINUTES = 18 * 60;
                        const MAX_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;

                        // New Top Calculation
                        // If Reverse: Top is calculated from the BOTTOM up.
                        // Or rather, 0px = Late Night.
                        // Let's mirror it: NewTop = MAX_HEIGHT - (OriginalTop + Height)
                        const top = state.reverse
                            ? originalTop
                            : MAX_HEIGHT - (originalTop + height);

                        // Find local sub-column (overlap index)
                        let subColIndex = 0;
                        let safety = 0;
                        while (true) {
                            const isFree = !localPositioned.some(pb =>
                                pb.subColIndex === subColIndex &&
                                !(end <= pb.start || start >= pb.end)
                            );
                            if (isFree) break;
                            subColIndex++;
                            if (safety++ > 50) { // Safety break
                                console.warn('Possible infinite loop in subCol assignment', band);
                                break;
                            }
                        }

                        localPositioned.push({
                            band,
                            start,
                            end,
                            top,
                            height,
                            subColIndex
                        });
                    });

                    // Assign final widths based on overlaps in this column
                    localPositioned.forEach(pb => {
                        const overlaps = localPositioned.filter(other =>
                            other !== pb &&
                            !(pb.end <= other.start || pb.start >= other.end)
                        );
                        const maxSubCol = Math.max(pb.subColIndex, ...overlaps.map(o => o.subColIndex));
                        const totalSubCols = maxSubCol + 1;

                        // Width relative to the 20% column (or dynamic %)
                        const relativeWidth = 100 / totalSubCols;
                        const relativeLeft = pb.subColIndex * relativeWidth;

                        // Absolute % on the screen
                        // Base Left = GroupColIndex * COLUMN_WIDTH_PCT
                        // Offset = RelativeLeft% of COLUMN_WIDTH_PCT
                        let finalWidth = (relativeWidth / 100) * COLUMN_WIDTH_PCT;

                        // User Request: Max width 33% of the day column
                        finalWidth = Math.min(finalWidth, 33);

                        // Centering Logic
                        // Available width for this sub-block is COLUMN_WIDTH_PCT
                        // Used width is finalWidth * totalSubCols
                        const usedWidth = finalWidth * totalSubCols;
                        const remainingWidth = Math.max(0, COLUMN_WIDTH_PCT - usedWidth);
                        const shiftRight = remainingWidth / 2;

                        pb.widthPct = finalWidth;
                        // Base (Group Col Start) + (SubCol * Width) + Centering Offset
                        pb.leftPct = (groupColIndex * COLUMN_WIDTH_PCT) + (pb.subColIndex * finalWidth) + shiftRight;

                        positionedBands.push(pb);
                    });
                });

            } else {
                // --- STRATEGY A: CLUSTERED CLASHFINDER (Favorites) ---
                // 1. Group connected bands into clusters to ensure consistent grid sizing.
                // 2. Within clusters, assign columns prioritizing Mainstage -> Left.

                const dayBandsWithGeometry = dayBands.map(band => {
                    const start = timeToMinutes(band.DEBUT);
                    const end = timeToMinutes(band.FIN);
                    const duration = end - start;
                    const height = Math.max(20, duration * PIXELS_PER_MINUTE);
                    const originalTop = (start - (START_HOUR * 60)) * PIXELS_PER_MINUTE;
                    const TOTAL_MINUTES = 18 * 60;
                    const MAX_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;
                    const top = state.reverse ? originalTop : MAX_HEIGHT - (originalTop + height);

                    return {
                        band, start, end, top, height,
                        id: band.id,
                        sceneIndex: SCENE_ORDER.indexOf(SCENE_COUPLES[band.SCENE] || 'UNKNOWN')
                    };
                });

                // Helper: Check overlap
                const overlaps = (a, b) => a.start < b.end && a.end > b.start;

                // Build Clusters (Connected Components)
                const visited = new Set();
                const clusters = [];

                dayBandsWithGeometry.forEach(item => {
                    if (visited.has(item.id)) return;

                    const cluster = [];
                    const queue = [item];
                    visited.add(item.id);

                    while (queue.length > 0) {
                        const current = queue.shift();
                        cluster.push(current);

                        // Find neighbors
                        dayBandsWithGeometry.forEach(other => {
                            if (!visited.has(other.id) && overlaps(current, other)) {
                                visited.add(other.id);
                                queue.push(other);
                            }
                        });
                    }
                    clusters.push(cluster);
                });

                // Process Each Cluster
                clusters.forEach(cluster => {
                    // Sort by Scene Priority (MS First) then Time
                    // This ensures MS gets Col 0.
                    cluster.sort((a, b) => {
                        if (a.sceneIndex !== b.sceneIndex) return a.sceneIndex - b.sceneIndex;
                        return a.start - b.start;
                    });

                    // Assign Columns (Greedy)
                    const columns = []; // Array of end times per column

                    cluster.forEach(item => {
                        let placed = false;
                        for (let i = 0; i < columns.length; i++) {
                            // Can fit in col i?
                            // Need to check specific overlap with items ALREADY in col i?
                            // Simplified: Just track all items in col i? 
                            // Using a simple "Latest End Time" per column isn't enough if there are gaps.
                            // But for a dense cluster, gaps are small.
                            // Better: Check against all items assigned to col i. (Filtered check).

                            // Actually, since we sorted by Priority, we just want the first *valid* column.
                            // But wait, if we put MS in Col 0 (23h), and earlier band (22h) in Col 0?
                            // Priority sort puts MS first. MS (23h) takes Col 0.
                            // Earlier Band (22h - 23h50). Overlaps MS.
                            // Earlier Band comes LATER in sort? (if Priority > Time).
                            // If Earlier Band is NOT MS (e.g. Altar), it has higher sceneIndex.
                            // So MS (23h) is processed first -> Col 0.
                            // Altar (22h) is processed second -> Clashes with Col 0 -> Col 1.
                            // Visual: Col 0 starts at 23h. Col 1 starts at 22h.
                            // Result: MS is Left. Altar is Right.
                            // This is what the user wants ("Sabaton à gauche"). YES.

                            const canFit = !cluster.some(other =>
                                other.subColIndex === i && overlaps(item, other)
                            );

                            if (canFit) {
                                item.subColIndex = i;
                                placed = true;
                                break;
                            }
                        }
                        if (!placed) {
                            item.subColIndex = columns.length;
                            columns.push(true); // new col
                        }
                    });

                    const totalSubCols = columns.length;

                    // NEW LOGIC: Packed Center
                    // We want columns to be at most 33% wide (user request), 
                    // but they must shrink if there are too many to fit in 100%.
                    const MAX_COL_WIDTH = 33;
                    const calculatedColWidth = 100 / totalSubCols;
                    const colWidth = Math.min(MAX_COL_WIDTH, calculatedColWidth);

                    const totalClusterWidth = totalSubCols * colWidth;
                    const globalLeftOffset = (100 - totalClusterWidth) / 2;

                    // Finalize Position
                    cluster.forEach(item => {
                        // Smart Expansion is disabled to enforce uniform column widths 
                        // and strict adjacency ("glued" look).
                        // If we allowed expansion, a band could become wider than its neighbors, 
                        // creating misalignment or gaps in the "packed" look.

                        // BUT, if an item spans multiple columns (greedy allocation might do this?),
                        // we should respect it? 
                        // Our greedy allocation (lines 449-485) assigns a SINGLE subColIndex.
                        // It does not reserve multiple columns for one item.
                        // So widthPct is strictly colWidth.

                        item.widthPct = colWidth;
                        item.leftPct = globalLeftOffset + (item.subColIndex * colWidth);

                        positionedBands.push(item);
                    });
                });
            }

            columns[day] = positionedBands;
        });

        return columns;
    }, [filteredGroups, filterMode, state.reverse, selectedScenes]); // Added dependencies

    return (
        <div className="weekly-view">
            <div className="weekly-header">
                {/* Left: Title */}
                <div className="weekly-header-left">
                    <h2>Résumé Semaine</h2>
                </div>

                {/* Center: Scene Filters */}
                <div className="weekly-header-center">
                    <button
                        className="scene-filter-tiny-btn all"
                        onClick={toggleAllScenes}
                        title={selectedScenes.length >= Object.keys(STAGE_CONFIG).length ? "Tout masquer" : "Tout afficher"}
                    >
                        {selectedScenes.length >= Object.keys(STAGE_CONFIG).length ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}
                    </button>
                    {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            className={`scene-filter-tiny-btn ${selectedScenes.includes(key) ? 'active' : ''}`}
                            onClick={() => toggleScene(key)}
                            style={{
                                '--scene-color': config.themeColor,
                                opacity: selectedScenes.includes(key) ? 1 : 0.4
                            }}
                            title={config.name}
                        >
                            <img src={config.icon} alt={config.name} className="mini-icon" />
                        </button>
                    ))}
                    {/* CUSTOM EVENTS TOGGLE */}
                    <button
                        className={`scene-filter-tiny-btn ${selectedScenes.includes('CUSTOM') ? 'active' : ''}`}
                        onClick={() => toggleScene('CUSTOM')}
                        style={{
                            '--scene-color': '#adb5bd', // Grey for generic custom
                            opacity: selectedScenes.includes('CUSTOM') ? 1 : 0.4,
                            marginLeft: '8px'
                        }}
                        title="Créneaux perso"
                    >
                        <span style={{ fontSize: '1.2em' }}>👤</span>
                    </button>
                </div>

                {/* Right: View Mode Filters */}
                <div className="weekly-header-right" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="weekly-filters" style={{ justifyContent: 'flex-end' }}>
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
                    <div className="weekly-filters" style={{ justifyContent: 'flex-end' }}>
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
                </div>
            </div>

            <div className="weekly-grid">
                {['Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, dayIdx) => (
                    <div key={day} className={`weekly-day-column col-${dayIdx}`}>
                        {/* Time Ruler (every hour) - Now inside each column for responsive 2x2 alignment */}
                        <div className="weekly-time-ruler">
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
                        <div className="weekly-day-header">{day}</div>
                        <div className="weekly-day-content">
                            {dayColumns[day].map((item, idx) => {
                                const stageColor = STAGE_CONFIG[item.band.SCENE]?.themeColor || '#555';
                                const tagData = getBandTag(item.band.id);
                                const isTagged = !!tagData;

                                // Dynamic Color Logic
                                const interestColor = isTagged && tagData.interest
                                    ? getInterestColor(tagData.interest)
                                    : 'white'; // Fallback to white if no specific color? Or default Gold? 
                                // Actually original was "white". But if interest logic works, getInterestColor returns hex.

                                return (
                                    <div
                                        id={`group-${item.band.id}`}
                                        key={item.band.id}
                                        className="weekly-band-card"
                                        style={{
                                            top: item.top,
                                            height: item.height,
                                            left: `${item.leftPct}%`,
                                            width: `${item.widthPct}%`,
                                            backgroundColor: colorMode === 'scene' ? stageColor : '#2a2a2a',
                                            border: isTagged ? '0px solid white' : (colorMode === 'scene' ? `1px solid ${chroma(stageColor).darken(1.5).hex()}` : '1px solid rgba(255,255,255,0.1)'),
                                            borderLeft: `4px solid ${colorMode === 'scene' ? chroma(stageColor).darken(1.5).hex() : stageColor}`,
                                            color: '#fff',
                                            boxShadow: colorMode === 'scene' ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.4)'
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
                                            {isTagged && (
                                                <div
                                                    className="weekly-band-star"
                                                    style={{ color: interestColor }}
                                                >
                                                    ★
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* CUSTOM EVENTS LAYER (Filtered) */}
                            {selectedScenes.includes('CUSTOM') && (customEvents || []).filter(e => e.day === day).map(event => {
                                // Time Parsing & Position Logic matching WeeklyView layout
                                const [startH, startM] = event.startTime.split(':').map(Number);
                                const [endH, endM] = event.endTime.split(':').map(Number);

                                let sH = startH;
                                let eH = endH;

                                // Adjust for night hours (< 6h) to match DayView/Band logic
                                if (sH < 6) sH += 24;
                                if (eH < 6) eH += 24;
                                if (eH < sH) eH += 24; // Handle wrap around

                                const start = sH * 60 + startM;
                                const end = eH * 60 + endM;
                                const duration = end - start;

                                const height = Math.max(20, duration * PIXELS_PER_MINUTE);
                                const originalTop = (start - (START_HOUR * 60)) * PIXELS_PER_MINUTE;
                                const TOTAL_MINUTES = 18 * 60;
                                const MAX_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;

                                const top = state.reverse
                                    ? originalTop
                                    : MAX_HEIGHT - (originalTop + height);

                                return (
                                    <div
                                        key={event.id}
                                        className="weekly-custom-event"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onEditCustomEvent) onEditCustomEvent(event);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: `${top}px`,
                                            height: `${height}px`,
                                            left: '2%',
                                            width: '96%',
                                            zIndex: 50,
                                            backgroundColor: 'rgba(255, 255, 255, 0.45)', // Matching DayView opacity
                                            border: '1px solid rgba(255, 255, 255, 0.5)',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            backdropFilter: 'blur(2px)',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                            overflow: 'hidden'
                                        }}
                                        title={`${event.title} (${event.startTime} - ${event.endTime})`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', padding: '0 5px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>{ICONS[event.type] || '📍'}</span>
                                            {/* Only show title if height allows (event > 20min approx so >20px height) */}
                                            {height > 25 && (
                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {event.title}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

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

export default WeeklyView;
