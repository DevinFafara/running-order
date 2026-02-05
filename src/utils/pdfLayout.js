import { STAGE_CONFIG } from '../constants';
import { timeToMinutes } from './statsUtils';

const START_HOUR = 10;
const TOTAL_MINUTES = 18 * 60; // 10h to 04h

const SCENE_GROUPS = [
    ['MAINSTAGE 1', 'MAINSTAGE 2'],
    ['WARZONE', 'VALLEY'],
    ['ALTAR', 'TEMPLE'],
    ['HELLSTAGE', 'METAL_CORNER'],
    ['PURPLE_HOUSE']
];

const SCENE_COUPLES = {
    'MAINSTAGE 1': 'MS', 'MAINSTAGE 2': 'MS',
    'WARZONE': 'WV', 'VALLEY': 'WV',
    'ALTAR': 'AT', 'TEMPLE': 'AT',
    'HELLSTAGE': 'HM', 'METAL_CORNER': 'HM',
    'PURPLE_HOUSE': 'PH'
};

const SCENE_ORDER = ['MS', 'WV', 'AT', 'HM', 'PH'];

const doTimesOverlap = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

export const calculateWeeklyLayout = (dayBands, pixelsPerMinute, reverse = false, mode = 'favorites', selectedScenes = []) => {
    if (!dayBands || dayBands.length === 0) return [];

    const MAX_HEIGHT = TOTAL_MINUTES * pixelsPerMinute;

    if (mode === 'all') {
        // --- STRATEGY B: DYNAMIC COLUMNS (MATCH WEB VIEW) ---
        const activeSceneGroups = SCENE_GROUPS.filter(group =>
            group.some(sceneKey => selectedScenes.includes(sceneKey))
        );

        const totalActiveCols = activeSceneGroups.length;
        const COLUMN_WIDTH_PCT = totalActiveCols > 0 ? (100 / totalActiveCols) : 0;
        const positionedBands = [];

        activeSceneGroups.forEach((sceneGroup, groupColIndex) => {
            const colBands = dayBands.filter(b => sceneGroup.includes(b.SCENE));

            // Sort: MS1 > MS2, then time
            colBands.sort((a, b) => {
                if (a.SCENE !== b.SCENE) {
                    const idxA = sceneGroup.indexOf(a.SCENE);
                    const idxB = sceneGroup.indexOf(b.SCENE);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                }
                const startA = timeToMinutes(a.DEBUT);
                const startB = timeToMinutes(b.DEBUT);
                return reverse ? startA - startB : startB - startA;
            });

            const localPositioned = [];
            colBands.forEach(band => {
                const start = timeToMinutes(band.DEBUT);
                const end = timeToMinutes(band.FIN) < start ? timeToMinutes(band.FIN) + 1440 : timeToMinutes(band.FIN);
                const duration = end - start;
                const height = Math.max(20, duration * pixelsPerMinute);
                const originalTop = (start - (START_HOUR * 60)) * pixelsPerMinute;
                const top = reverse ? originalTop : MAX_HEIGHT - (originalTop + height);

                let subColIndex = 0;
                while (true) {
                    const isFree = !localPositioned.some(pb =>
                        pb.subColIndex === subColIndex && doTimesOverlap(start, end, pb.start, pb.end)
                    );
                    if (isFree) break;
                    subColIndex++;
                }

                localPositioned.push({ band, start, end, top, height, subColIndex });
            });

            localPositioned.forEach(pb => {
                const overlaps = localPositioned.filter(other =>
                    other !== pb && doTimesOverlap(pb.start, pb.end, other.start, other.end)
                );
                const maxSubCol = Math.max(pb.subColIndex, ...overlaps.map(o => o.subColIndex));
                const totalSubCols = maxSubCol + 1;
                const relativeWidth = 100 / totalSubCols;
                let finalWidth = (relativeWidth / 100) * COLUMN_WIDTH_PCT;
                finalWidth = Math.min(finalWidth, 33); // User limit from web code

                const usedWidth = finalWidth * totalSubCols;
                const remainingWidth = Math.max(0, COLUMN_WIDTH_PCT - usedWidth);
                const shiftRight = remainingWidth / 2;

                pb.widthPct = finalWidth;
                pb.leftPct = (groupColIndex * COLUMN_WIDTH_PCT) + (pb.subColIndex * finalWidth) + shiftRight;
                positionedBands.push(pb);
            });
        });

        return positionedBands;

    } else {
        // --- STRATEGY A: CLASHFINDER (MATCH WEB VIEW) ---
        const groupsToLayout = dayBands.map(g => ({
            ...g,
            _start: timeToMinutes(g.DEBUT),
            _end: timeToMinutes(g.FIN) < timeToMinutes(g.DEBUT) ? timeToMinutes(g.FIN) + 1440 : timeToMinutes(g.FIN),
            sceneCouple: SCENE_COUPLES[g.SCENE] || 'UNKNOWN'
        }));

        // Pass 1: Max Sim Context
        groupsToLayout.forEach(g => {
            const overlapping = groupsToLayout.filter(other =>
                other.id !== g.id && doTimesOverlap(g._start, g._end, other._start, other._end)
            );
            const uniqueCouples = new Set([g.sceneCouple, ...overlapping.map(o => o.sceneCouple)]);
            g.maxSimCols = uniqueCouples.size;
            g.maxSimContext = [...uniqueCouples].sort((a, b) => SCENE_ORDER.indexOf(a) - SCENE_ORDER.indexOf(b));
        });

        // Pass 2: Sandwich Detection
        groupsToLayout.forEach(g => {
            const overlapping = groupsToLayout.filter(other =>
                other.id !== g.id && doTimesOverlap(g._start, g._end, other._start, other._end)
            );
            const g_sc_index = SCENE_ORDER.indexOf(g.sceneCouple);
            const leftPartners = new Set();
            const rightPartners = new Set();
            overlapping.forEach(other => {
                const other_sc_index = SCENE_ORDER.indexOf(other.sceneCouple);
                if (g_sc_index !== -1 && other_sc_index !== -1) {
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

        // Pass 3: Selection & Pass 4: Propagation
        groupsToLayout.forEach(g => {
            if (g.isSandwiched && g.sandwichedCols > g.maxSimCols) {
                g.finalContext = [...g.sandwichedContext];
                g.finalNumCols = g.sandwichedCols;
            } else {
                g.finalContext = [...g.maxSimContext];
                g.finalNumCols = g.maxSimCols;
            }
        });

        let changed = true;
        let iter = 0;
        while (changed && iter < 10) {
            changed = false; iter++;
            groupsToLayout.forEach(g1 => {
                groupsToLayout.forEach(g2 => {
                    if (g1 === g2) return;
                    if (doTimesOverlap(g1._start, g1._end, g2._start, g2._end)) {
                        if (g1.finalContext.includes(g2.sceneCouple)) {
                            if (g1.finalNumCols > g2.finalNumCols || (g1.finalNumCols === g2.finalNumCols && g1.finalContext.join(',') !== g2.finalContext.join(','))) {
                                g2.finalContext = [...g1.finalContext];
                                g2.finalNumCols = g1.finalNumCols;
                                changed = true;
                            }
                        }
                    }
                });
            });
        }

        return groupsToLayout.map(g => {
            let posIndex = g.finalContext.indexOf(g.sceneCouple);
            if (posIndex === -1) posIndex = 0;

            const totalCols = Math.max(1, g.finalNumCols);
            let widthPct = 100 / totalCols;
            widthPct = Math.min(widthPct, 50);

            const usedWidth = widthPct * totalCols;
            const remainingWidth = Math.max(0, 100 - usedWidth);
            const shiftRight = remainingWidth / 2;

            const leftPct = (posIndex * widthPct) + shiftRight;

            const duration = g._end - g._start;
            const height = Math.max(20, duration * pixelsPerMinute);
            const originalTop = (g._start - (START_HOUR * 60)) * pixelsPerMinute;
            const top = reverse ? originalTop : MAX_HEIGHT - (originalTop + height);

            return { band: g, start: g._start, end: g._end, top, height, widthPct, leftPct };
        });
    }
};
