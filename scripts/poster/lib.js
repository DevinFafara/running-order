/**
 * Outils partagés du protocole « affiche → running order ».
 * Horaires au format de la programmation : "19h05". Minutes « festival » : avant 6 h = nuit (+24 h).
 */
import fs from 'fs';

export const NIGHT_CUTOFF = 6;

export const toMin = (t) => {
    const [h, m] = String(t).replace(':', 'h').split('h').map(Number);
    return (h < NIGHT_CUTOFF ? h + 24 : h) * 60 + (m || 0);
};

export const fromMin = (min) => {
    const m = ((min % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}h${String(m % 60).padStart(2, '0')}`;
};

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf-8'));
export const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

/** Colonnes de la programmation, dans l'ordre du Google Sheet. */
export const COLUMNS = [
    'id', 'GROUPE', 'STYLE', 'PAYS', 'COUNTRY', 'PARTICIPATIONS', 'SCENE', 'DAY', 'DEBUT', 'FIN',
    'Bio', 'BIO_EN', 'FFO', 'DEEZER', 'SPOTIFY', 'QOBUZ', 'BANDCAMP', 'YOUTUBE', 'SETLISTFM',
    'SITE', 'FACEBOOK', 'INSTAGRAM', 'LASTFM',
];

/** CSV prêt à coller dans le Google Sheet (séparateur virgule, guillemets si besoin). */
export const toCsv = (rows) => {
    const cell = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [COLUMNS.join(','), ...rows.map(r => COLUMNS.map(c => cell(r[c])).join(','))].join('\n') + '\n';
};

/** Même tableau en TSV (séparé par tabulations) : se colle directement dans un Google Sheet, une valeur par cellule. */
export const toTsv = (rows) => {
    const cell = (v) => (v === null || v === undefined ? '' : String(v).replace(/[\t\n]/g, ' '));
    return [COLUMNS.join('\t'), ...rows.map(r => COLUMNS.map(c => cell(r[c])).join('\t'))].join('\n') + '\n';
};

export const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

/**
 * Prestige d'un créneau : plus il est long, plus il est prestigieux ; à durée égale, le plus tardif.
 * Sert à associer l'ordre d'affiche (tête d'affiche en premier) aux créneaux.
 */
export const byPrestige = (a, b) => (b.end - b.start) - (a.end - a.start) || b.start - a.start;

/**
 * Créneaux d'une scène pour un jour, à partir du gabarit d'un pôle.
 * @param {Array} template  [{ stage: 0|1, start, end }] (horaires "16h00")
 * @param {number} stageIndex  0 = 1re scène du pôle, 1 = 2de
 */
export const stageSlots = (template, stageIndex) => template
    .filter(s => s.stage === stageIndex)
    .map(s => ({ start: toMin(s.start), end: toMin(s.end) }));

/**
 * Ajuste la liste des créneaux au nombre de groupes de l'affiche :
 *  - trop de créneaux → on retire les moins prestigieux en commençant par les plus tôt ;
 *  - pas assez → on ajoute des créneaux de 30 min avant le premier (5 min de changement de plateau),
 *    en sautant ceux de l'autre scène du pôle pour que les deux scènes continuent d'alterner.
 * Renvoie { slots, notes } ; les notes alimentent le rapport.
 */
export const fitSlots = (slots, otherStageSlots, count) => {
    const notes = [];
    let list = [...slots].sort((a, b) => a.start - b.start);
    if (list.length > count) {
        notes.push(`${list.length - count} créneau(x) en trop retiré(s) en début de journée`);
        list = list.slice(list.length - count);
    }
    if (list.length < count) {
        const busy = [...otherStageSlots, ...list];
        let cursor = Math.min(...busy.map(s => s.start), list[0]?.start ?? 16 * 60);
        const extra = [];
        while (list.length + extra.length < count) {
            const end = cursor - 5;
            const start = end - 30;
            extra.unshift({ start, end, added: true });
            cursor = start - 35; // laisse la place d'un créneau à l'autre scène
        }
        notes.push(`${extra.length} créneau(x) ajouté(s) avant le premier concert — horaires à vérifier`);
        list = [...extra, ...list];
    }
    return { slots: list, notes };
};
