import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { STAGE_CONFIG, INTEREST_LEVELS, CONTEXT_TAGS } from '../../constants';
import { timeToMinutes } from '../../utils/statsUtils';
import { calculateWeeklyLayout } from '../../utils/pdfLayout';
import chroma from 'chroma-js';

const PIXELS_PER_MINUTE_PDF = 0.51;
const START_HOUR = 10;
const TOTAL_MINUTES = 18 * 60;
const GRID_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE_PDF;

const normalizeScene = s => s ? s.toUpperCase().trim() : '';
const doTimesOverlap = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

// ─── Column definitions per day type ────────────────────────────────────────
const PRINT_COLUMNS = {
    // Jeudi / Vendredi / Samedi / Dimanche  →  3 couples principaux + 4 annexes individuelles
    main: [
        { scenes: ['MAINSTAGE 1', 'MAINSTAGE 2'], label: 'Mainstage 1\nMainstage 2' },
        { scenes: ['WARZONE', 'VALLEY'],           label: 'Warzone\nValley' },
        { scenes: ['ALTAR', 'TEMPLE'],             label: 'Altar\nTemple' },
        { scenes: ['HELLSTAGE'],                   label: 'Hellstage' },
        { scenes: ['HELLCITY_STAGE'],              label: 'Hellcity\nBrewpub' },
        { scenes: ['PURPLE_HOUSE'],                label: 'Purple House' },
        { scenes: ['METAL_CORNER'],                label: 'Metal Corner' },
    ],
    // Mercredi  →  3 couples d'annexes (avec sous-colonnes si chevauchement)
    mercredi: [
        { scenes: ['HELLSTAGE', 'HELLCITY_STAGE'],   label: 'Hellstage\nHellcity Brewpub' },
        { scenes: ['PURPLE_HOUSE', 'METAL_CORNER'],  label: 'Purple House\nMetal Corner' },
        { scenes: ['LE_OFF1', 'LE_OFF2'],            label: 'Le Off 1\nLe Off 2' },
    ],
    // Mardi  →  1 seule colonne Le Off 1 + 2 (pas de chevauchement → empilement)
    mardi: [
        { scenes: ['LE_OFF1', 'LE_OFF2'], label: 'Le Off 1 & Le Off 2' },
    ],
};

// Page 1 : Mercredi – Jeudi – Vendredi
// Page 2 : Samedi – Dimanche – Mardi
const PAGE_CONFIGS = [
    [
        { day: 'Mercredi', type: 'mercredi', flex: 2 },
        { day: 'Jeudi',    type: 'main',     flex: 3 },
        { day: 'Vendredi', type: 'main',     flex: 3 },
    ],
    [
        { day: 'Samedi',   type: 'main',     flex: 3 },
        { day: 'Dimanche', type: 'main',     flex: 3 },
        { day: 'Mardi',    type: 'mardi',    flex: 2 },
    ],
];

// ─── Layout algorithm for fixed print columns ────────────────────────────────
const positionBandsForPrint = (dayBands, columns, reverse) => {
    const numCols = columns.length;
    const result = [];

    columns.forEach((col, colIdx) => {
        const colLeftPct = (colIdx / numCols) * 100;
        const colWidthPct = 100 / numCols;

        // Une scène/couple n'occupe jamais plus de 50% de la largeur de la journée
        const effectiveWidthPct = Math.min(colWidthPct, 50);
        const colShift = (colWidthPct - effectiveWidthPct) / 2; // centrage dans l'espace alloué

        const colBands = dayBands.filter(b =>
            col.scenes.some(s => normalizeScene(s) === normalizeScene(b.SCENE))
        );

        colBands.forEach(band => {
            const start = timeToMinutes(band.DEBUT);
            const rawEnd = timeToMinutes(band.FIN);
            const end = rawEnd < start ? rawEnd + 1440 : rawEnd;
            const duration = end - start;
            const height = Math.max(8, duration * PIXELS_PER_MINUTE_PDF);
            const originalTop = (start - START_HOUR * 60) * PIXELS_PER_MINUTE_PDF;
            const top = reverse ? originalTop : GRID_HEIGHT - (originalTop + height);

            let leftPct = colLeftPct + colShift;
            let widthPct = effectiveWidthPct;

            // Pour les colonnes à 2 scènes : sous-colonnes si chevauchement intra-couple
            if (col.scenes.length === 2) {
                const otherBands = colBands.filter(o =>
                    normalizeScene(o.SCENE) !== normalizeScene(band.SCENE)
                );
                const hasOverlap = otherBands.some(other => {
                    const os = timeToMinutes(other.DEBUT);
                    const ore = timeToMinutes(other.FIN);
                    const oe = ore < os ? ore + 1440 : ore;
                    return doTimesOverlap(start, end, os, oe);
                });
                if (hasOverlap) {
                    const scenePos = col.scenes.findIndex(
                        s => normalizeScene(s) === normalizeScene(band.SCENE)
                    );
                    widthPct = effectiveWidthPct / 2;
                    leftPct = colLeftPct + colShift + scenePos * widthPct;
                }
            }

            result.push({ band, top, height, leftPct, widthPct });
        });
    });

    return result;
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    page: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        padding: 5,
    },
    dayTimeRuler: {
        width: 14,
        position: 'relative',
        flexShrink: 0,
        borderRightWidth: 0.5,
        borderRightColor: '#dddddd',
    },
    timeMarker: {
        position: 'absolute',
        left: 0,
        right: 0,
        borderTopWidth: 0.5,
        borderTopColor: '#dddddd',
        borderTopStyle: 'dashed',
    },
    timeLabel: {
        fontSize: 4.5,
        color: '#aaaaaa',
        textAlign: 'right',
        paddingRight: 2,
        backgroundColor: '#ffffff',
        marginTop: -3,
    },
    dayColumn: {
        borderRightWidth: 1.5,
        borderRightColor: '#777777',
        borderRightStyle: 'dashed',
        flexDirection: 'column',
        height: '100%',
    },
    dayHeader: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        paddingVertical: 3,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#cccccc',
    },
    colHeaderRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#dddddd',
        backgroundColor: '#fafafa',
    },
    colHeader: {
        flex: 1,
        fontSize: 4.5,
        color: '#666666',
        textAlign: 'center',
        paddingVertical: 2,
        paddingHorizontal: 1,
        borderRightWidth: 0.5,
        borderRightColor: '#eeeeee',
    },
    gridContent: {
        flex: 1,
        position: 'relative',
    },
    colSeparator: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 0.5,
        backgroundColor: '#eeeeee',
    },
    bandCard: {
        position: 'absolute',
        borderRadius: 1,
        borderWidth: 0.5,
        borderColor: '#dddddd',
        overflow: 'hidden',
        padding: 1,
        justifyContent: 'center',
    },
    bandName: {
        fontSize: 4.5,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
    },
    bandTime: {
        fontSize: 4,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        color: '#333333',
    },
    tagStar: {
        position: 'absolute',
        top: 1,
        right: 2,
    },
    // Légende Mardi
    legend: {
        position: 'absolute',
        top: 6,
        left: 4,
        right: 4,
        borderWidth: 0.75,
        borderColor: '#aaaaaa',
        borderRadius: 2,
        backgroundColor: '#ffffff',
        padding: 5,
    },
    legendTitle: {
        fontSize: 5.5,
        color: '#555555',
        marginBottom: 5,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 3,
    },
    legendSwatchPair: {
        flexDirection: 'row',
        marginHorizontal: 3,
    },
    legendSwatch: {
        width: 9,
        height: 7,
        borderRadius: 1,
        marginHorizontal: 1,
    },
    legendLabel: {
        fontSize: 6,
        color: '#222222',
        flex: 1,
    },
});

// ─── Time Ruler (intégré à gauche de chaque colonne-journée) ─────────────────
const DayTimeRuler = ({ reverse }) => (
    <View style={styles.dayTimeRuler}>
        {Array.from({ length: 18 }).map((_, i) => {
            const h = START_HOUR + i;
            const label = h >= 24 ? `${h - 24}h` : `${h}h`;
            const originalTop = i * 60 * PIXELS_PER_MINUTE_PDF;
            const top = reverse ? originalTop : GRID_HEIGHT - originalTop;
            return (
                <View key={i} style={[styles.timeMarker, { top }]}>
                    <Text style={styles.timeLabel}>{label}</Text>
                </View>
            );
        })}
    </View>
);

// ─── Helpers mode favoris ────────────────────────────────────────────────────
const ALL_DAYS_ORDER = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MIN_UNIT_MM = 30;   // largeur minimale par unité de clash
const PAGE_WIDTH_MM = 287; // A4 paysage - marges

const computeMaxSim = (dayBands) => {
    if (dayBands.length === 0) return 0;
    let maxSim = 1;
    dayBands.forEach(b => {
        const s = timeToMinutes(b.DEBUT);
        const rawE = timeToMinutes(b.FIN);
        const e = rawE < s ? rawE + 1440 : rawE;
        const sim = dayBands.filter(o => {
            const os = timeToMinutes(o.DEBUT);
            const ore = timeToMinutes(o.FIN);
            const oe = ore < os ? ore + 1440 : ore;
            return s < oe && e > os;
        }).length;
        maxSim = Math.max(maxSim, sim);
    });
    return maxSim;
};

// ─── Légende pour Mardi — paires de scènes ──────────────────────────────────
const LEGEND_PAIRS = [
    ['MAINSTAGE 1',  'MAINSTAGE 2'],
    ['WARZONE',      'VALLEY'],
    ['ALTAR',        'TEMPLE'],
    ['HELLSTAGE',    'HELLCITY_STAGE'],
    ['PURPLE_HOUSE', 'METAL_CORNER'],
    ['LE_OFF1',      'LE_OFF2'],
];

const MardiLegend = () => (
    <View style={styles.legend}>
        <Text style={styles.legendTitle}>LÉGENDE DES SCÈNES</Text>
        {LEGEND_PAIRS.map(([leftKey, rightKey]) => {
            const lc = STAGE_CONFIG[leftKey];
            const rc = STAGE_CONFIG[rightKey];
            if (!lc || !rc) return null;
            return (
                <View key={leftKey} style={styles.legendRow}>
                    <Text style={[styles.legendLabel, { textAlign: 'right' }]}>{lc.name}</Text>
                    <View style={styles.legendSwatchPair}>
                        <View style={[styles.legendSwatch, { backgroundColor: lc.themeColor || '#555' }]} />
                        <View style={[styles.legendSwatch, { backgroundColor: rc.themeColor || '#555' }]} />
                    </View>
                    <Text style={[styles.legendLabel, { textAlign: 'left' }]}>{rc.name}</Text>
                </View>
            );
        })}
    </View>
);

// ─── Colonne journée mode Favoris (layout dynamique Strategy A) ──────────────
const FavDayColumn = ({ day, bands, flex, isLast, colorMode, taggedBands, reverse, customEvents, selectedScenes }) => {
    // Strategy A pour le positionnement horizontal uniquement
    // On recalcule ensuite top/height avec les métriques PDF correctes (min 8 au lieu de 20)
    const rawItems = calculateWeeklyLayout(bands, PIXELS_PER_MINUTE_PDF, reverse, 'favorites', []);
    const layoutItems = rawItems.map(item => {
        const duration = item.end - item.start;
        const height = Math.max(8, duration * PIXELS_PER_MINUTE_PDF);
        const originalTop = (item.start - START_HOUR * 60) * PIXELS_PER_MINUTE_PDF;
        const top = reverse ? originalTop : GRID_HEIGHT - (originalTop + height);
        return { ...item, top, height };
    });
    const dayCustom = (customEvents || []).filter(e =>
        e.day === day && (selectedScenes || []).includes('CUSTOM')
    );

    return (
        <View style={[styles.dayColumn, { flex }, isLast && { borderRightWidth: 0 }]}>
            <Text style={styles.dayHeader}>{day.toUpperCase()}</Text>
            <View style={{ flex: 1, flexDirection: 'row' }}>
                <DayTimeRuler reverse={reverse} />
                <View style={styles.gridContent}>
                    {layoutItems.map((item, idx) => {
                        const stageColor = STAGE_CONFIG[item.band.SCENE]?.themeColor || '#555555';
                        const cardBg = colorMode === 'scene' ? stageColor : '#f9f9f9';
                        const tagInfo = taggedBands[item.band.id];
                        const isTagged = !!tagInfo;
                        const isShort = item.height < 8;
                        const isCompact = item.height < 16;
                        const textColor = colorMode === 'scene' ? '#ffffff' : '#000000';
                        const interestColor = tagInfo?.interest && INTEREST_LEVELS[tagInfo.interest]?.defaultColor
                            ? INTEREST_LEVELS[tagInfo.interest].defaultColor
                            : '#d4af37';
                        return (
                            <View
                                key={item.band.id || idx}
                                style={[
                                    styles.bandCard,
                                    isCompact && { padding: 0 },
                                    {
                                        top: item.top,
                                        height: item.height,
                                        left: `${item.leftPct}%`,
                                        width: `${item.widthPct}%`,
                                        backgroundColor: cardBg,
                                        borderLeftWidth: 2,
                                        borderLeftColor: stageColor,
                                        borderColor: '#dddddd',
                                    }
                                ]}
                            >
                                <Text style={[styles.bandName, { color: textColor }]}>{item.band.GROUPE}</Text>
                                {!isShort && (
                                    <Text style={[styles.bandTime, { color: colorMode === 'scene' ? '#eeeeee' : '#333333' }]}>
                                        {item.band.DEBUT}-{item.band.FIN}
                                    </Text>
                                )}
                                {isTagged && (
                                    <Text style={[styles.tagStar, { color: interestColor, fontSize: isCompact ? 9 : 13, fontFamily: 'Helvetica-Bold' }]}>
                                        *
                                    </Text>
                                )}
                            </View>
                        );
                    })}

                    {dayCustom.map((event, cidx) => {
                        const [sh, sm] = event.startTime.split(':').map(Number);
                        const [eh, em] = event.endTime.split(':').map(Number);
                        let sH = sh < 6 ? sh + 24 : sh;
                        let eH = eh < 6 ? eh + 24 : eh;
                        if (eH < sH) eH += 24;
                        const start = sH * 60 + sm;
                        const end = eH * 60 + em;
                        const height = Math.max(8, (end - start) * PIXELS_PER_MINUTE_PDF);
                        const originalTop = (start - START_HOUR * 60) * PIXELS_PER_MINUTE_PDF;
                        const top = reverse ? originalTop : GRID_HEIGHT - (originalTop + height);
                        return (
                            <View
                                key={`custom-${cidx}`}
                                style={[styles.bandCard, {
                                    top, height, left: '2%', width: '96%',
                                    backgroundColor: '#ffffff',
                                    borderStyle: 'dashed', borderWidth: 1, borderColor: '#aaaaaa',
                                    borderLeftWidth: 3, borderLeftColor: '#adb5bd',
                                }]}
                            >
                                <Text style={[styles.bandName, { fontSize: 5, color: '#333333' }]}>{event.title}</Text>
                                <Text style={styles.bandTime}>{event.startTime}-{event.endTime}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

// ─── Day Column ──────────────────────────────────────────────────────────────
const DayColumn = ({ day, type, flex, isLast, groups, filterMode, colorMode, taggedBands, reverse, customEvents, selectedScenes }) => {
    const columns = PRINT_COLUMNS[type];
    const numCols = columns.length;

    let dayBands = groups.filter(g =>
        (g.JOUR === day || g.DAY === day) &&
        columns.some(col => col.scenes.some(s => normalizeScene(s) === normalizeScene(g.SCENE)))
    );

    if (filterMode === 'favorites') {
        dayBands = dayBands.filter(g => taggedBands[g.id]);
    }

    const layoutItems = positionBandsForPrint(dayBands, columns, reverse);

    // Custom events
    const dayCustom = (customEvents || []).filter(e =>
        e.day === day && selectedScenes.includes('CUSTOM')
    );

    return (
        <View style={[styles.dayColumn, { flex }, isLast && { borderRightWidth: 0 }]}>
            <Text style={styles.dayHeader}>{day.toUpperCase()}</Text>

            {/* Row : ruler à gauche + (colHeaderRow + grille) à droite */}
            <View style={{ flex: 1, flexDirection: 'row' }}>
            <DayTimeRuler reverse={reverse} />
            <View style={{ flex: 1, flexDirection: 'column' }}>
            {/* Sous-entêtes de colonnes — alignés sur gridContent, hors ruler */}
            <View style={styles.colHeaderRow}>
                {columns.map((col, i) => (
                    <Text
                        key={i}
                        style={[styles.colHeader, i === numCols - 1 && { borderRightWidth: 0 }]}
                    >
                        {col.label}
                    </Text>
                ))}
            </View>
            <View style={styles.gridContent}>
                {/* Séparateurs de colonnes */}
                {columns.slice(1).map((_, i) => (
                    <View
                        key={i}
                        style={[styles.colSeparator, { left: `${((i + 1) / numCols) * 100}%` }]}
                    />
                ))}

                {/* Cartes groupes */}
                {layoutItems.map((item, idx) => {
                    const stageColor = STAGE_CONFIG[item.band.SCENE]?.themeColor || '#555555';
                    const cardBg = colorMode === 'scene' ? stageColor : '#f9f9f9';
                    const tagInfo = taggedBands[item.band.id];
                    const isTagged = !!tagInfo;
                    const isShort = item.height < 8;
                    const isCompact = item.height < 16;
                    const textColor = colorMode === 'scene' ? '#ffffff' : '#000000';
                    const interestColor = tagInfo?.interest && INTEREST_LEVELS[tagInfo.interest]?.defaultColor
                        ? INTEREST_LEVELS[tagInfo.interest].defaultColor
                        : '#d4af37';

                    return (
                        <View
                            key={item.band.id || idx}
                            style={[
                                styles.bandCard,
                                isCompact && { padding: 0 },
                                {
                                    top: item.top,
                                    height: item.height,
                                    left: `${item.leftPct}%`,
                                    width: `${item.widthPct}%`,
                                    backgroundColor: cardBg,
                                    borderLeftWidth: 2,
                                    borderLeftColor: stageColor,
                                    borderColor: '#dddddd',
                                }
                            ]}
                        >
                            <Text style={[styles.bandName, { color: textColor }]}>
                                {item.band.GROUPE}
                            </Text>
                            {!isShort && (
                                <Text style={[styles.bandTime, { color: colorMode === 'scene' ? '#eeeeee' : '#555555' }]}>
                                    {item.band.DEBUT}-{item.band.FIN}
                                </Text>
                            )}
                            {isTagged && (
                                <Text style={[styles.tagStar, {
                                    color: interestColor,
                                    fontSize: isCompact ? 9 : 13,
                                    fontFamily: 'Helvetica-Bold',
                                }]}>*</Text>
                            )}
                        </View>
                    );
                })}

                {/* Custom events */}
                {dayCustom.map((event, cidx) => {
                    const [sh, sm] = event.startTime.split(':').map(Number);
                    const [eh, em] = event.endTime.split(':').map(Number);
                    let sH = sh < 6 ? sh + 24 : sh;
                    let eH = eh < 6 ? eh + 24 : eh;
                    if (eH < sH) eH += 24;
                    const start = sH * 60 + sm;
                    const end = eH * 60 + em;
                    const duration = end - start;
                    const height = Math.max(8, duration * PIXELS_PER_MINUTE_PDF);
                    const originalTop = (start - START_HOUR * 60) * PIXELS_PER_MINUTE_PDF;
                    const top = reverse ? originalTop : GRID_HEIGHT - (originalTop + height);

                    return (
                        <View
                            key={`custom-${cidx}`}
                            style={[
                                styles.bandCard,
                                {
                                    top, height,
                                    left: '2%', width: '96%',
                                    backgroundColor: '#ffffff',
                                    borderStyle: 'dashed',
                                    borderWidth: 1,
                                    borderColor: '#aaaaaa',
                                    borderLeftWidth: 3,
                                    borderLeftColor: '#adb5bd',
                                    zIndex: 50,
                                }
                            ]}
                        >
                            <Text style={[styles.bandName, { fontSize: 5, color: '#333333' }]}>
                                {event.title}
                            </Text>
                            <Text style={styles.bandTime}>
                                {event.startTime}-{event.endTime}
                            </Text>
                        </View>
                    );
                })}

                {/* Légende scènes pour Mardi */}
                {type === 'mardi' && <MardiLegend />}
            </View>
            </View>{/* fin col colHeaderRow + gridContent */}
            </View>{/* fin row ruler + contenu */}
        </View>
    );
};

// ─── Main component ──────────────────────────────────────────────────────────
const WeeklyPDF = ({ groups, customEvents, selectedScenes, filterMode, colorMode, taggedBands, reverse }) => {
    // ── Mode Favoris : layout dynamique ──────────────────────────────────────
    if (filterMode === 'favorites') {
        const dayData = ALL_DAYS_ORDER.map(day => {
            let dayBands = groups.filter(g =>
                (g.JOUR === day || g.DAY === day) && selectedScenes.includes(g.SCENE)
            );
            dayBands = dayBands.filter(g => taggedBands[g.id]);
            return { day, bands: dayBands, rawSim: Math.max(1, computeMaxSim(dayBands)) };
        }).filter(d => d.bands.length > 0);

        if (dayData.length === 0) {
            return (
                <Document title="Hellfest 2026 - Mes Favoris">
                    <Page size="A4" orientation="landscape" style={styles.page}>
                        <Text style={{ margin: 'auto', fontSize: 12, color: '#888888' }}>
                            Aucun favori sélectionné
                        </Text>
                    </Page>
                </Document>
            );
        }

        // Plafonne le ratio max à 3× le jour le plus petit
        const minSim = Math.min(...dayData.map(d => d.rawSim));
        const cappedData = dayData.map(d => ({ ...d, flex: Math.min(d.rawSim, minSim * 3) }));
        const totalUnits = cappedData.reduce((sum, d) => sum + d.flex, 0);
        const needsTwoPages = totalUnits * MIN_UNIT_MM > PAGE_WIDTH_MM && cappedData.length > 1;

        let pages;
        if (!needsTwoPages) {
            pages = [cappedData];
        } else {
            // Split optimal : minimise l'écart d'unités entre les deux pages
            let bestSplit = 1;
            let bestDiff = Infinity;
            let cumulative = 0;
            for (let i = 0; i < cappedData.length - 1; i++) {
                cumulative += cappedData[i].flex;
                const diff = Math.abs(2 * cumulative - totalUnits);
                if (diff < bestDiff) { bestDiff = diff; bestSplit = i + 1; }
            }
            pages = [cappedData.slice(0, bestSplit), cappedData.slice(bestSplit)];
        }

        return (
            <Document title="Hellfest 2026 - Mes Favoris">
                {pages.map((pageDays, pageIdx) => (
                    <Page key={pageIdx} size="A4" orientation="landscape" style={styles.page}>
                        {pageDays.map((dayInfo, idx) => (
                            <FavDayColumn
                                key={dayInfo.day}
                                day={dayInfo.day}
                                bands={dayInfo.bands}
                                flex={dayInfo.flex}
                                isLast={idx === pageDays.length - 1}
                                colorMode={colorMode}
                                taggedBands={taggedBands}
                                reverse={reverse}
                                customEvents={customEvents}
                                selectedScenes={selectedScenes}
                            />
                        ))}
                    </Page>
                ))}
            </Document>
        );
    }

    // ── Mode Tout le monde : layout fixe 2 pages ──────────────────────────────
    return (
        <Document title="Hellfest 2026 - Running Order">
            {PAGE_CONFIGS.map((pageLayout, pageIdx) => (
                <Page key={pageIdx} size="A4" orientation="landscape" style={styles.page}>
                    {pageLayout.map((dayConfig, idx) => (
                        <DayColumn
                            key={dayConfig.day}
                            {...dayConfig}
                            isLast={idx === pageLayout.length - 1}
                            groups={groups}
                            filterMode={filterMode}
                            colorMode={colorMode}
                            taggedBands={taggedBands}
                            reverse={reverse}
                            customEvents={customEvents}
                            selectedScenes={selectedScenes}
                        />
                    ))}
                </Page>
            ))}
        </Document>
    );
};

export default WeeklyPDF;
