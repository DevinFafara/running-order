import React, { useState, useMemo } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useLineup } from '../../hooks/useLineup'; // Assuming this hook exists or we pass groups as prop
import { STAGE_CONFIG, INTEREST_LEVELS } from '../../constants';
// Reuse timeToMinutes for layout calcs
import { timeToMinutes } from '../../utils/statsUtils';
import './WeeklyView.css';

const START_HOUR = 10; // Start at 10:00
const PIXELS_PER_MINUTE = 0.8; // Compact vertical scale

const WeeklyView = ({ groups, onGroupClick }) => {
    const { state, getInterestColor, getBandTag } = useCheckedState();
    const [filterMode, setFilterMode] = useState('favorites'); // 'favorites' or 'all'
    const [selectedScenes, setSelectedScenes] = useState(() => Object.keys(STAGE_CONFIG));

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
        if (selectedScenes.length === Object.keys(STAGE_CONFIG).length) {
            setSelectedScenes([]);
        } else {
            setSelectedScenes(Object.keys(STAGE_CONFIG));
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
            const sortBands = (bands) => {
                bands.sort((a, b) => {
                    const startA = timeToMinutes(a.DEBUT);
                    const startB = timeToMinutes(b.DEBUT);

                    // Primary sort: Start time
                    if (startA !== startB) {
                        return state.reverse ? startB - startA : startA - startB;
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

                    // Apply Sort
                    sortBands(colBands);

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
                            ? MAX_HEIGHT - (originalTop + height)
                            : originalTop;

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
                        pb.widthPct = (relativeWidth / 100) * COLUMN_WIDTH_PCT;
                        pb.leftPct = (groupColIndex * COLUMN_WIDTH_PCT) + ((relativeLeft / 100) * COLUMN_WIDTH_PCT);

                        positionedBands.push(pb);
                    });
                });

            } else {
                // --- STRATEGY A: COMPACT CLASHFINDER (Favorites) ---

                // Apply Sort
                sortBands(dayBands);

                dayBands.forEach(band => {
                    const start = timeToMinutes(band.DEBUT);
                    const end = timeToMinutes(band.FIN);
                    const duration = end - start;
                    const originalTop = (start - (START_HOUR * 60)) * PIXELS_PER_MINUTE;
                    const height = Math.max(20, duration * PIXELS_PER_MINUTE);

                    // Reverse logic
                    const TOTAL_MINUTES = 18 * 60;
                    const MAX_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;
                    const top = state.reverse
                        ? MAX_HEIGHT - (originalTop + height)
                        : originalTop;

                    let colIndex = 0;
                    let safety = 0;
                    while (true) {
                        const isFree = !positionedBands.some(pb =>
                            pb.colIndex === colIndex &&
                            !(end <= pb.start || start >= pb.end)
                        );
                        if (isFree) break;
                        colIndex++;
                        if (safety++ > 50) {
                            console.warn('Possible infinite loop in favorites col assignment', band);
                            break;
                        }
                    }

                    positionedBands.push({
                        band,
                        start,
                        end,
                        top,
                        height,
                        colIndex
                    });
                });

                // Calculate widths for compact mode
                positionedBands.forEach(pb => {
                    const overlaps = positionedBands.filter(other =>
                        other !== pb &&
                        !(pb.end <= other.start || pb.start >= other.end)
                    );
                    const maxCol = Math.max(pb.colIndex, ...overlaps.map(o => o.colIndex));
                    const totalCols = maxCol + 1;
                    pb.widthPct = 100 / totalCols;
                    pb.leftPct = pb.colIndex * pb.widthPct;
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
                        title={selectedScenes.length === Object.keys(STAGE_CONFIG).length ? "Tout masquer" : "Tout afficher"}
                    >
                        {selectedScenes.length === Object.keys(STAGE_CONFIG).length ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}
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
                </div>

                {/* Right: View Mode Filters */}
                <div className="weekly-header-right">
                    <button
                        className={`weekly-filter-btn ${filterMode === 'favorites' ? 'active' : ''}`}
                        onClick={() => setFilterMode('favorites')}
                    >
                        Mes Favoris
                    </button>
                    <button
                        className={`weekly-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterMode('all')}
                    >
                        Tout le monde
                    </button>
                </div>
            </div>

            <div className="weekly-grid">
                {/* Time Ruler (every hour) */}
                <div className="weekly-time-ruler">
                    {Array.from({ length: 18 }).map((_, i) => {
                        const h = START_HOUR + i;
                        const label = h >= 24 ? `${h - 24}h` : `${h}h`;

                        // Calculate position
                        const minutesFromStart = i * 60;
                        const originalTop = minutesFromStart * PIXELS_PER_MINUTE;
                        const TOTAL_MINUTES = 18 * 60;
                        const MAX_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;

                        // For markers, they are 0-height lines usually, but 'top' position matters.
                        // Inverted: NewTop = MAX_HEIGHT - OriginalTop
                        // Wait, if 10h is at 0px originally.
                        // Inverted: 10h should be at Bottom (MAX_HEIGHT).
                        const top = state.reverse
                            ? MAX_HEIGHT - originalTop
                            : originalTop;

                        return (
                            <div
                                key={i}
                                className="time-marker"
                                style={{ top: top }}
                            >
                                {label}
                            </div>
                        );
                    })}
                </div>

                {['Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => (
                    <div key={day} className="weekly-day-column">
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
                                        key={item.band.id}
                                        className="weekly-band-card"
                                        style={{
                                            top: item.top,
                                            height: item.height,
                                            left: `${item.leftPct}%`,
                                            width: `${item.widthPct}%`,
                                            backgroundColor: '#2a2a2a', // Dark background
                                            borderLeft: `4px solid ${stageColor}`,
                                            border: isTagged ? '1px solid white' : 'none', // White border also for tagged
                                            borderLeftWidth: '4px',
                                            borderLeftColor: stageColor
                                        }}
                                        onClick={() => onGroupClick(item.band)}
                                        title={`${item.band.GROUPE} (${item.band.SCENE})`}
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
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeeklyView;
