import React from 'react';
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { STAGE_CONFIG } from '../../constants';
import { calculateWeeklyLayout } from '../../utils/pdfLayout';
import { timeToMinutes } from '../../utils/statsUtils';
import chroma from 'chroma-js';

// Register a standard font or try to load Metal Mania if you have a URL
Font.register({
    family: 'Metal Mania',
    src: 'https://fonts.gstatic.com/s/metalmania/v19/twKjebvS6UcmVvNnEisA9V6O5iY.ttf'
});

const PIXELS_PER_MINUTE_PDF = 0.55; // Fits 18h into A4 Landscape height (~595pt)
const START_HOUR = 10;
const TOTAL_MINUTES = 18 * 60;
const GRID_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE_PDF;

const styles = StyleSheet.create({
    page: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        padding: 5,
    },
    dayColumn: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: '#eeeeee',
        position: 'relative',
        height: '100%',
    },
    dayHeader: {
        fontSize: 12,
        fontFamily: 'Metal Mania',
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
        fontWeight: 'bold',
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
                    let dayGroups = groups.filter(g => g.JOUR === day && selectedScenes.includes(g.SCENE));
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
                        <View key={day} style={styles.dayColumn}>
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
                                    const isTagged = !!taggedBands[item.band.id];

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
                                            {isTagged && <Text style={styles.star}>★</Text>}
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
                                                backgroundColor: 'rgba(200, 200, 200, 0.2)',
                                                borderStyle: 'dashed',
                                                borderWidth: 1,
                                                borderColor: '#999999',
                                                borderLeftWidth: 3,
                                                borderLeftColor: '#adb5bd',
                                            }
                                        ]}
                                    >
                                        <Text style={styles.bandName}>{item.event.title}</Text>
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
