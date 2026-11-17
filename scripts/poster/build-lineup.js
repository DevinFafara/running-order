/**
 * Construit le running order complet d'une édition à partir de la transcription de l'affiche.
 *
 * Entrée : un fichier JSON « affiche » (voir poster-2027.example.json et README.md) qui donne,
 * pour chaque jour et chaque scène, la liste des groupes dans l'ordre de l'affiche
 * (le plus gros nom en premier).
 *
 * Méthode de placement horaire :
 *   1. Chaque pôle reçoit la grille de créneaux d'un couple de l'édition précédente (gabarit).
 *   2. Les créneaux de chaque scène sont classés par prestige : durée décroissante, puis le plus tardif.
 *   3. Le 1er groupe de l'affiche prend le créneau le plus prestigieux, le 2e le suivant, etc.
 *   4. Si l'affiche compte plus ou moins de groupes que de créneaux, la grille est ajustée et signalée.
 *   Un groupe peut imposer ses horaires : { "name": "...", "start": "21h00", "end": "22h15" }.
 *
 * Sorties : lineup JSON (lu par l'app), CSV à importer et TSV à copier-coller dans le Google Sheet, rapport Markdown.
 *
 * Usage : node scripts/poster/build-lineup.js scripts/poster/poster-2027.json
 */
import fs from 'fs';
import path from 'path';
import config from './config-2027.js';
import { readJson, writeJson, toMin, fromMin, toCsv, toTsv, LOREM, byPrestige, stageSlots, fitSlots } from './lib.js';

const posterFile = process.argv[2];
if (!posterFile) {
    console.error('Usage : node scripts/poster/build-lineup.js <affiche.json>');
    process.exit(1);
}

const { edition, templates, idStart, output } = config;
const poster = readJson(path.resolve(posterFile));
const grid = readJson(path.resolve(config.slotGrid));
const UNKNOWN = '???';

const report = [`# Running order ${edition.year} construit depuis l'affiche`, '', `Source : \`${path.basename(posterFile)}\``, ''];
const warnings = [];
const placed = [];

edition.days.forEach(({ key: day }) => {
    const dayPoster = poster.days?.[day];
    if (!dayPoster) { warnings.push(`${day} : absent de l'affiche`); return; }

    edition.poles.forEach(pole => {
        const template = grid.days[day]?.[templates[pole.id]];
        if (!template) { warnings.push(`${day} / ${pole.name} : pas de gabarit horaire`); return; }

        // Créneaux des deux scènes du pôle (pour l'ajustement en cas d'écart)
        const raw = pole.stages.map((_, i) => stageSlots(template, i));

        pole.stages.forEach((stage, i) => {
            const bands = (dayPoster[stage] || []).map(b => (typeof b === 'string' ? { name: b } : b));
            if (bands.length === 0) return;
            bands.filter(b => b.uncertain).forEach(b => warnings.push(`${day} / ${stage} : nom à confirmer « ${b.name} »`));

            // Groupes aux horaires imposés : placés tels quels, et les créneaux du gabarit
            // qui les chevauchent (sur l'une ou l'autre scène du pôle) sont retirés du lot
            const isFixed = (b) => b.start && b.end;
            const fixedAll = pole.stages.flatMap(s => (dayPoster[s] || []).filter(b => typeof b === 'object' && isFixed(b)))
                .map(b => ({ start: toMin(b.start), end: toMin(b.end) }));
            const overlapsFixed = (sl) => fixedAll.some(f => sl.start < f.end && sl.end > f.start);
            bands.filter(isFixed).forEach(b => {
                placed.push({ day, stage, band: b, start: toMin(b.start), end: toMin(b.end), how: 'imposé' });
            });

            const toPlace = bands.filter(b => !isFixed(b));
            if (toPlace.length === 0) return;
            const { slots, notes } = fitSlots(raw[i].filter(sl => !overlapsFixed(sl)), raw[1 - i], toPlace.length);
            notes.forEach(n => warnings.push(`${day} / ${stage} : ${n}`));

            // Les autres : ordre d'affiche → créneaux par prestige
            const ranked = [...slots].sort(byPrestige);
            toPlace.forEach((b, rank) => {
                const sl = ranked[rank];
                placed.push({ day, stage, band: b, start: sl.start, end: sl.end, how: sl.added ? 'ajouté' : `rang ${rank + 1}` });
            });
        });
    });

    // Scènes de l'affiche inconnues de l'édition
    Object.keys(dayPoster).filter(s => !edition.stages.some(st => st.key === s))
        .forEach(s => warnings.push(`${day} : scène inconnue « ${s} » ignorée`));
});

// Tri : jour, scène, heure
const dayIdx = (d) => edition.days.findIndex(x => x.key === d);
const stageIdx = (s) => edition.stages.findIndex(x => x.key === s);
placed.sort((a, b) => dayIdx(a.day) - dayIdx(b.day) || stageIdx(a.stage) - stageIdx(b.stage) || a.start - b.start);

// Identifiants STABLES : les favoris des utilisateurs sont enregistrés par id.
// Un groupe garde son id d'une reconstruction à l'autre (registre nom → id), même si
// d'autres groupes sont ajoutés, retirés ou déplacés. Un nouveau groupe reçoit max + 1.
const registryFile = path.resolve(config.idRegistry);
const registry = fs.existsSync(registryFile) ? readJson(registryFile) : { ids: {} };
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
let nextId = Math.max(idStart - 1, ...Object.values(registry.ids)) + 1;
const usedIds = new Set();
const idFor = (p) => {
    const base = norm(p.band.name);
    // Un même nom deux fois dans l'édition (rare) : la 2e occurrence est distinguée par jour
    const key = registry.ids[base] !== undefined && usedIds.has(registry.ids[base]) ? `${base} | ${p.day}` : base;
    if (registry.ids[key] === undefined) {
        registry.ids[key] = nextId++;
        warnings.push(`Nouvel identifiant ${registry.ids[key]} pour « ${p.band.name} »`);
    }
    usedIds.add(registry.ids[key]);
    return registry.ids[key];
};
if (nextId > edition.idRange.max) warnings.push(`Plage d'identifiants ${edition.idRange.min}–${edition.idRange.max} dépassée`);

const rows = placed.map((p) => ({
    id: idFor(p),
    GROUPE: p.band.name.toUpperCase(),
    STYLE: p.band.style || UNKNOWN,
    PAYS: p.band.country || UNKNOWN,
    COUNTRY: p.band.country || UNKNOWN,
    PARTICIPATIONS: p.band.lastVisit || UNKNOWN,
    SCENE: p.stage,
    DAY: p.day,
    DEBUT: fromMin(p.start),
    FIN: fromMin(p.end),
    Bio: LOREM,
    BIO_EN: LOREM,
    FFO: null, DEEZER: null, SPOTIFY: null, QOBUZ: null, BANDCAMP: null, YOUTUBE: null,
    SETLISTFM: null, SITE: null, FACEBOOK: null, INSTAGRAM: null, LASTFM: null,
}));

// Contrôle : deux groupes d'un même pôle qui se chevauchent
edition.days.forEach(({ key: day }) => edition.poles.forEach(pole => {
    const items = placed.filter(p => p.day === day && pole.stages.includes(p.stage)).sort((a, b) => a.start - b.start);
    items.slice(1).forEach((p, k) => {
        if (p.start < items[k].end) warnings.push(`${day} / ${pole.name} : chevauchement ${items[k].band.name} ↔ ${p.band.name}`);
    });
}));

// Écritures
[output.csv, output.report].forEach(f => fs.mkdirSync(path.dirname(path.resolve(f)), { recursive: true }));
writeJson(path.resolve(output.json), rows);
writeJson(registryFile, registry);
fs.writeFileSync(path.resolve(output.csv), toCsv(rows));
fs.writeFileSync(path.resolve(output.tsv), toTsv(rows));

edition.days.forEach(({ key: day }) => {
    const dayRows = placed.filter(p => p.day === day);
    if (!dayRows.length) return;
    report.push(`## ${day} (${dayRows.length} groupes)`, '');
    edition.stages.forEach(st => {
        const list = dayRows.filter(p => p.stage === st.key);
        if (!list.length) return;
        report.push(`**${st.name}**`, '', '| Horaire | Groupe | Placement |', '| --- | --- | --- |');
        list.forEach(p => report.push(`| ${fromMin(p.start)} – ${fromMin(p.end)} | ${p.band.name} | ${p.how} |`));
        report.push('');
    });
});
report.push('## Points à vérifier', '', ...(warnings.length ? warnings.map(w => `- ${w}`) : ['- Aucun']), '');
fs.writeFileSync(path.resolve(output.report), report.join('\n'));

console.log(`✅ ${rows.length} groupes placés`);
console.log(`   JSON    → ${output.json}`);
console.log(`   CSV     → ${output.csv}`);
console.log(`   TSV     → ${output.tsv} (à copier-coller dans le Sheet)`);
console.log(`   Rapport → ${output.report}`);
if (warnings.length) console.log(`⚠️  ${warnings.length} point(s) à vérifier (voir le rapport)`);
