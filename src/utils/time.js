import { EDITION } from '../editions';

/**
 * Module horaire unique.
 * Convertit "19h05", "19:05" ou "19" en minutes depuis le début de la journée festival.
 * Un horaire avant `nightCutoffHour` (6 h) appartient à la nuit : +24 h.
 */
export const toFestivalMinutes = (timeStr, cutoffHour = EDITION.nightCutoffHour) => {
    if (typeof timeStr !== 'string' || !timeStr) return 0;
    const [hRaw, mRaw] = timeStr.replace('h', ':').split(':');
    let h = parseInt(hRaw, 10);
    const m = parseInt(mRaw || '0', 10);
    if (Number.isNaN(h)) return 0;
    if (h < cutoffHour) h += 24;
    return h * 60 + (Number.isNaN(m) ? 0 : m);
};

/** Début et fin d'un groupe en minutes festival (fin toujours après le début). */
export const bandRange = (band) => {
    const start = toFestivalMinutes(band.DEBUT);
    let end = toFestivalMinutes(band.FIN);
    if (end <= start) end += 24 * 60;
    return { start, end };
};

export const rangesOverlap = (a, b) => a.start < b.end && a.end > b.start;

/** Minutes festival → "HH:MM". */
export const formatMinutes = (minutes) => {
    const m = ((minutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Date locale → 'YYYY-MM-DD'. */
export const localDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const FESTIVAL_DAY_MAP = Object.fromEntries(EDITION.days.map(d => [d.date, d.key]));

/** Jour festival d'une date (avant le seuil de nuit = nuit de la veille), ou null hors festival. */
export const getFestivalDayName = (date) => {
    const adjusted = new Date(date);
    if (date.getHours() < EDITION.nightCutoffHour) adjusted.setDate(adjusted.getDate() - 1);
    return FESTIVAL_DAY_MAP[localDateKey(adjusted)] ?? null;
};

/** Heure d'une date en minutes festival (avant le seuil de nuit : +24 h). */
export const dateToFestivalMinutes = (date) => {
    const h = date.getHours();
    return (h < EDITION.nightCutoffHour ? h + 24 : h) * 60 + date.getMinutes();
};
