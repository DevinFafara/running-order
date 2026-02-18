import { useState, useEffect } from 'react';
import { STAGES, STAGE_CONFIG } from '../constants';

/**
 * Converts a "HH:MM" time string to minutes since midnight.
 * Handles post-midnight times (< 6h) by adding 24h.
 */
function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    // Support both '19h30' and '19:30' formats
    const normalized = timeStr.replace('h', ':');
    const [h, m] = normalized.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    let minutes = h * 60 + m;
    if (h < 6) minutes += 24 * 60; // post-midnight
    return minutes;
}

/**
 * Returns the current time in minutes since midnight (with post-midnight +24h).
 * If simulatedMinutes is provided, uses that instead of real time.
 */
function getCurrentMinutes(simulatedMinutes = null) {
    if (simulatedMinutes !== null) return simulatedMinutes;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    let minutes = h * 60 + m;
    if (h < 6) minutes += 24 * 60;
    return minutes;
}

/**
 * For a given list of groups (already filtered by day) and current time,
 * returns a map of stageKey → { playing, next, status }
 *
 * status: 'playing' | 'next' | 'idle'
 * playing: group object currently on stage, or null
 * next: next group to play, or null
 */
export function useCurrentBands(groups, simulatedMinutes = null) {
    const [stageStatus, setStageStatus] = useState({});

    useEffect(() => {
        function compute() {
            const currentMinutes = getCurrentMinutes(simulatedMinutes);
            const result = {};

            const allStageKeys = Object.keys(STAGES);

            allStageKeys.forEach((stageKey) => {
                const stageName = STAGES[stageKey];
                const stageGroups = groups.filter((g) => g.SCENE === stageName);

                // Sort by start time
                const sorted = [...stageGroups].sort((a, b) => {
                    return timeToMinutes(a.DEBUT) - timeToMinutes(b.DEBUT);
                });

                // Find currently playing
                const playing = sorted.find((g) => {
                    const start = timeToMinutes(g.DEBUT);
                    const end = timeToMinutes(g.FIN);
                    return start !== null && end !== null && currentMinutes >= start && currentMinutes < end;
                }) || null;

                // Find next group (first one starting after now)
                const next = sorted.find((g) => {
                    const start = timeToMinutes(g.DEBUT);
                    return start !== null && start > currentMinutes;
                }) || null;

                // Find last played (most recent one that ended before now)
                const past = sorted.filter((g) => {
                    const end = timeToMinutes(g.FIN);
                    return end !== null && end <= currentMinutes;
                });
                const lastPlayed = past.length > 0 ? past[past.length - 1] : null;

                let status = 'idle';
                if (playing) status = 'playing';
                else if (next) status = 'next';

                result[stageKey] = {
                    playing,
                    next,
                    lastPlayed,
                    status,
                    config: STAGE_CONFIG[stageName],
                };
            });

            setStageStatus(result);
        }

        compute();

        // Refresh every 30 seconds
        const interval = setInterval(compute, 30000);
        return () => clearInterval(interval);
    }, [groups, simulatedMinutes]);

    return stageStatus;
}
