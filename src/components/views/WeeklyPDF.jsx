import React from 'react';
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { STAGE_CONFIG, INTEREST_LEVELS } from '../../constants';
import { calculateWeeklyLayout } from '../../utils/pdfLayout';
import { timeToMinutes } from '../../utils/statsUtils';
import chroma from 'chroma-js';

// Standard fonts like Helvetica are built-in to PDF
const PIXELS_PER_MINUTE_PDF = 0.5244; // Increased by another 15%
const START_HOUR = 10;
const TOTAL_MINUTES = 18 * 60;
const GRID_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE_PDF;

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

const styles = StyleSheet.create({
    page: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        padding: 5,
    },
    dayColumn: {
        flex: 1,
        borderRightWidth: 2,
        borderRightColor: '#333333',
        position: 'relative',
        height: '100%',
    },
    dayHeader: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        paddingVertical: 4,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 2,
        borderBottomColor: '#333333',
    },
    gridContent: {
        flex: 1,
        position: 'relative',
        marginTop: 5,
    },
    bandCard: {
        position: 'absolute',
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: '#dddddd',
        padding: 2,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    bandName: {
        fontSize: 6,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        color: '#000000',
        marginBottom: 1,
    },
    bandTime: {
        fontSize: 5,
        textAlign: 'center',
        color: '#444444',
    },
    timeRuler: {
        position: 'absolute',
        left: 0,
        width: 20,
        height: '100%',
        zIndex: 10,
    },
    timeMarker: {
        position: 'absolute',
        width: '100%',
        borderTopWidth: 0.5,
        borderTopColor: '#eeeeee',
        borderTopStyle: 'dashed',
    },
    timeLabel: {
        fontSize: 5,
        color: '#999999',
        textAlign: 'right',
        paddingRight: 2,
        backgroundColor: '#ffffff',
    },
    star: {
        position: 'absolute',
        top: 1,
        right: 1,
        fontSize: 6,
        color: '#d4af37',
    }
});

const WeeklyPDF = ({ groups, customEvents, selectedScenes, filterMode, colorMode, taggedBands, reverse }) => {
    const days = ['Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    return (
        <Document title="Hellfest 2026 - Running Order">
            <Page size="A4" orientation="landscape" style={styles.page}>
                {days.map((day, idx) => {
                    // Filter groups for this day
                    let dayGroups = groups.filter(g => (g.JOUR === day || g.DAY === day) && selectedScenes.includes(g.SCENE));
                    if (filterMode === 'favorites') {
                        dayGroups = dayGroups.filter(g => taggedBands[g.id]);
                    }

                    // Layout calculation
                    const layoutItems = calculateWeeklyLayout(dayGroups, PIXELS_PER_MINUTE_PDF, reverse, filterMode, selectedScenes);

                    // Custom events for this day
                    const dayCustom = customEvents.filter(e => e.day === day && selectedScenes.includes('CUSTOM'));
                    const customItems = dayCustom.map(event => {
                        const start = timeToMinutes(event.startTime);
                        const end = timeToMinutes(event.endTime) < start ? timeToMinutes(event.endTime) + 1440 : timeToMinutes(event.endTime);
                        const duration = end - start;
                        const minutesFromStart = start - (START_HOUR * 60);
                        const originalTop = minutesFromStart * PIXELS_PER_MINUTE_PDF;
                        const height = duration * PIXELS_PER_MINUTE_PDF;
                        const top = reverse ? originalTop : GRID_HEIGHT - originalTop - height;

                        return { event, top, height };
                    });

                    return (
                        <View key={day} style={[styles.dayColumn, idx === days.length - 1 && { borderRightWidth: 0 }]}>
                            <Text style={styles.dayHeader}>{day.toUpperCase()}</Text>

                            <View style={styles.gridContent}>
                                {/* Time Ruler on first day */}
                                {idx === 0 && (
                                    <View style={styles.timeRuler}>
                                        {Array.from({ length: 18 }).map((_, i) => {
                                            const h = START_HOUR + i;
                                            const label = h >= 24 ? `${h - 24}h` : `${h}h`;
                                            const minutesFromStart = i * 60;
                                            const originalTop = minutesFromStart * PIXELS_PER_MINUTE_PDF;
                                            const top = reverse ? originalTop : GRID_HEIGHT - originalTop;

                                            return (
                                                <View key={i} style={[styles.timeMarker, { top }]}>
                                                    <Text style={styles.timeLabel}>{label}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* Band Cards */}
                                {layoutItems.map(item => {
                                    const stageColor = STAGE_CONFIG[item.band.SCENE]?.themeColor || '#555555';
                                    const cardBg = colorMode === 'scene' ? stageColor : '#f9f9f9';
                                    const tagInfo = taggedBands[item.band.id];
                                    const isTagged = !!tagInfo;
                                    const interestColor = (tagInfo && tagInfo.interest && INTEREST_LEVELS[tagInfo.interest])
                                        ? INTEREST_LEVELS[tagInfo.interest].defaultColor
                                        : '#d4af37';

                                    // Helvetica doesn't always support the ★ symbol, using '*' for safety
                                    return (
                                        <View
                                            key={item.band.id}
                                            style={[
                                                styles.bandCard,
                                                {
                                                    top: item.top,
                                                    height: item.height,
                                                    left: item.leftPct + '%',
                                                    width: item.widthPct + '%',
                                                    backgroundColor: cardBg,
                                                    borderLeftWidth: 3,
                                                    borderLeftColor: colorMode === 'scene' ? chroma(stageColor).darken(1.5).hex() : stageColor,
                                                    borderColor: isTagged ? '#000000' : '#dddddd',
                                                }
                                            ]}
                                        >
                                            <Text style={[styles.bandName, { color: colorMode === 'scene' ? '#ffffff' : '#000000' }]}>
                                                {item.band.GROUPE}
                                            </Text>
                                            <Text style={[styles.bandTime, { color: colorMode === 'scene' ? '#eeeeee' : '#444444' }]}>
                                                {item.band.DEBUT}-{item.band.FIN}
                                            </Text>
                                            {isTagged && (
                                                <Text style={[styles.star, { color: interestColor, fontSize: 10, top: 0, right: 2 }]}>
                                                    *
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}

                                {/* Custom Events */}
                                {customItems.map((item, cidx) => (
                                    <View
                                        key={`custom-${cidx}`}
                                        style={[
                                            styles.bandCard,
                                            {
                                                top: item.top,
                                                height: item.height,
                                                left: 0,
                                                width: '100%',
                                                backgroundColor: '#ffffff', // Solid white to mask content
                                                borderStyle: 'dashed',
                                                borderWidth: 1,
                                                borderColor: '#999999',
                                                borderLeftWidth: 3,
                                                borderLeftColor: '#adb5bd',
                                            }
                                        ]}
                                    >
                                        <Text style={[styles.bandName, { fontSize: 8, color: '#333333' }]}>
                                            {item.event.title}
                                        </Text>
                                        <Text style={styles.bandTime}>{item.event.startTime}-{item.event.endTime}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    );
                })}
            </Page>
        </Document>
    );
};

export default WeeklyPDF;
