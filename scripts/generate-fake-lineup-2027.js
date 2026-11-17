/**
 * Génère une AFFICHE FICTIVE pour l'édition 2027 (prototype), avec les créneaux d'origine (grille 2026).
 * - 10 scènes réparties en 5 pôles, autant de groupes que de créneaux par scène
 * - Noms de groupes inventés ; styles et pays tirés au hasard pour faire vivre les stats
 *
 * Usage :
 *   node scripts/generate-fake-lineup-2027.js
 *   node scripts/poster/build-lineup.js scripts/poster/poster-2027.fake.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Générateur pseudo-aléatoire déterministe (même sortie à chaque exécution)
let seed = 2027;
const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const POLES = [
    { stages: ['MAINSTAGE 1', 'MAINSTAGE 2'], styles: ['Heavy Metal', 'Hard Rock', 'Metal Alternatif', 'Metalcore', 'Power Metal', 'Nu Metal'] },
    { stages: ['WARZONE', 'RIOT'], styles: ['Punk Rock', 'Hardcore', 'Crossover', 'Street Punk', 'Oi!', 'Skate Punk'] },
    { stages: ['VALLEY', 'ABYSS'], styles: ['Stoner', 'Sludge', 'Doom', 'Post Metal', 'Psyché', 'Drone'] },
    { stages: ['ALTAR', 'FORGE'], styles: ['Death Metal', 'Grindcore', 'Thrash Metal', 'Brutal Death Metal', 'Speed Metal', 'Deathcore'] },
    { stages: ['TEMPLE', 'CRYPT'], styles: ['Black Metal', 'Folk Metal', 'Pagan Metal', 'Metal Atmosphérique', 'Viking Metal', 'Dungeon Synth'] },
];

const ADJ = ['Ashen', 'Grim', 'Hollow', 'Black', 'Silent', 'Burning', 'Frozen', 'Rotten', 'Feral', 'Cursed', 'Pale', 'Savage',
    'Molten', 'Vile', 'Rusted', 'Lunar', 'Thorned', 'Wretched', 'Venomous', 'Obsidian', 'Howling', 'Sunken', 'Bleeding', 'Scarlet'];
const NOUN = ['Monolith', 'Harvest', 'Choir', 'Tide', 'Prophet', 'Engine', 'Serpent', 'Kingdom', 'Cathedral', 'Wolves', 'Furnace',
    'Hymn', 'Marrow', 'Legion', 'Vortex', 'Throne', 'Mire', 'Pyre', 'Covenant', 'Requiem', 'Gallows', 'Lantern', 'Comet', 'Orchard'];
const FR = ['Les Chiens de Paille', 'Brume Noire', 'Fer Rouillé', 'Ossuaire', 'La Meute', 'Sang d\'Encre', 'Charogne',
    'Nuit Blanche', 'Les Sans-Nom', 'Granit', 'Tempête', 'Vermine', 'Marée Basse', 'Clair Obscur', 'Bûcher', 'Saint-Sulfure'];
const COUNTRIES = [['France', 'France'], ['USA', 'USA'], ['Suède', 'Sweden'], ['Allemagne', 'Germany'], ['Norvège', 'Norway'],
    ['Royaume-Uni', 'United Kingdom'], ['Finlande', 'Finland'], ['Belgique', 'Belgium'], ['Canada', 'Canada'], ['Pologne', 'Poland'],
    ['Japon', 'Japan'], ['Brésil', 'Brazil'], ['Australie', 'Australia'], ['Italie', 'Italy'], ['Espagne', 'Spain']];

const usedNames = new Set();
const newName = () => {
    for (let i = 0; i < 500; i++) {
        const r = rand();
        const name = r < 0.12 ? pick(FR) : r < 0.2 ? `The ${pick(ADJ)} ${pick(NOUN)}` : `${pick(ADJ)} ${pick(NOUN)}`;
        if (!usedNames.has(name)) { usedNames.add(name); return name; }
    }
    throw new Error('Plus de noms disponibles');
};

// Créneaux : grille d'origine (édition 2026), via le protocole affiche → running order
const grid = JSON.parse(fs.readFileSync(path.join(__dirname, 'poster', 'slot-grid-2026.json'), 'utf-8'));
const TEMPLATE = ['MS', 'WV', 'WV', 'AT', 'AT'];
const DAYS = ['Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// On génère une « affiche » fictive (autant de groupes que de créneaux par scène),
// puis build-lineup.js la transforme en running order.
const poster = { edition: 2027, _comment: 'Affiche FICTIVE générée par generate-fake-lineup-2027.js', days: {} };
DAYS.forEach(day => {
    poster.days[day] = {};
    POLES.forEach((pole, p) => {
        const template = grid.days[day][TEMPLATE[p]];
        pole.stages.forEach((stage, i) => {
            const count = template.filter(s => s.stage === i).length;
            poster.days[day][stage] = Array.from({ length: count }, () => {
                const [pays] = pick(COUNTRIES);
                return { name: newName(), style: pick(pole.styles), country: pays };
            });
        });
    });
});

const POSTER_FILE = path.join(__dirname, 'poster', 'poster-2027.fake.json');
fs.writeFileSync(POSTER_FILE, `${JSON.stringify(poster, null, 2)}\n`);
console.log(`✅ Affiche fictive → ${POSTER_FILE}`);
console.log('   Étape suivante : node scripts/poster/build-lineup.js scripts/poster/poster-2027.fake.json');
