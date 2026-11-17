/**
 * Extrait la grille de créneaux d'une programmation passée (lineup.json d'une édition).
 *
 * Pour chaque jour et chaque couple de scènes qui alternent, on relève la suite des créneaux
 * et la scène (0 = 1re du couple, 1 = 2de) qui joue chacun. Cette grille sert de gabarit pour
 * placer les groupes d'une nouvelle édition à partir de l'affiche.
 *
 * Usage : node scripts/poster/extract-slot-grid.js public/lineup.json scripts/poster/slot-grid-2026.json
 */
import path from 'path';
import { readJson, writeJson, toMin } from './lib.js';

// Couples de l'édition source (2026) : 2 scènes qui alternent
const COUPLES = {
    MS: ['MAINSTAGE 1', 'MAINSTAGE 2'],
    WV: ['WARZONE', 'VALLEY'],
    AT: ['ALTAR', 'TEMPLE'],
};

const [input = 'public/lineup.json', output = 'scripts/poster/slot-grid-2026.json'] = process.argv.slice(2);
const rows = readJson(path.resolve(input)).filter(r => r && r.SCENE && r.DAY && r.DEBUT && r.FIN);

const days = [...new Set(rows.map(r => r.DAY))];
const grid = { source: path.basename(input), couples: COUPLES, days: {} };

days.forEach(day => {
    const perCouple = {};
    Object.entries(COUPLES).forEach(([id, stages]) => {
        const slots = rows
            .filter(r => r.DAY === day && stages.includes(r.SCENE))
            .sort((a, b) => toMin(a.DEBUT) - toMin(b.DEBUT))
            .map(r => ({ stage: stages.indexOf(r.SCENE), start: r.DEBUT, end: r.FIN }));
        if (slots.length) perCouple[id] = slots;
    });
    if (Object.keys(perCouple).length) grid.days[day] = perCouple;
});

writeJson(path.resolve(output), grid);
const summary = Object.entries(grid.days)
    .map(([day, c]) => `${day}: ${Object.entries(c).map(([id, s]) => `${id} ${s.length}`).join(', ')}`)
    .join(' · ');
console.log(`✅ Grille extraite → ${output}\n   ${summary}`);
