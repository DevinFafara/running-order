
import { DAYS, POLES, MAIN_STAGES } from '../constants';
import { toFestivalMinutes, bandRange } from './time';

// Module horaire unique (seuil de nuit commun à toute l'app)
export const timeToMinutes = (timeStr) => toFestivalMinutes(timeStr);

/** Scènes d'une journée ({ [SCENE]: nombre de groupes }), de la plus fréquentée à la moins fréquentée. */
export const sortStagesByCount = (stages = {}) => MAIN_STAGES
    .filter(stageKey => stages[stageKey] > 0)
    .sort((a, b) => (stages[b] - stages[a]) || (MAIN_STAGES.indexOf(a) - MAIN_STAGES.indexOf(b)));

/** Rangs, du plus haut au plus bas : seuil minimal du taux d'occupation moyen (%). */
export const RANKS = [
    { label: "Trve", min: 90 },
    { label: "Hellbanger", min: 60 },
    { label: "Amateur", min: 30 },
    { label: "Touriste", min: 0 },
];

/**
 * Fenêtre de chaque journée, calculée depuis la programmation : premier début et dernière fin.
 */
export const computeDayWindows = (lineup) => {
    const windows = {};
    DAYS.forEach(day => {
        const ranges = (lineup || []).filter(b => b.DAY === day && b.DEBUT && b.FIN).map(bandRange);
        windows[day] = ranges.length === 0 ? null : {
            start: Math.min(...ranges.map(r => r.start)),
            end: Math.max(...ranges.map(r => r.end)),
        };
    });
    return windows;
};

export const calculateStats = (rawLineup, rawTaggedBands) => {
    const lineup = rawLineup || [];
    const taggedBands = rawTaggedBands || {};
    const stats = {
        totalBands: 0,
        days: Object.fromEntries(DAYS.map(day => [day, { count: 0, stages: {} }])),
    };

    const dayWindows = computeDayWindows(lineup);

    const myBands = lineup.filter(group => {
        const interest = taggedBands[group.id]?.interest;
        return interest === 'must_see' || interest === 'interested' || interest === 'curious';
    });

    myBands.forEach(group => {
        stats.totalBands++;

        const duration = timeToMinutes(group.FIN) - timeToMinutes(group.DEBUT);

        if (duration > 0 && stats.days[group.DAY]) {
            stats.days[group.DAY].count++;

            const stageName = group.SCENE;
            if (stageName) {
                const normalized = stageName.toUpperCase();
                stats.days[group.DAY].stages[normalized] = (stats.days[group.DAY].stages[normalized] || 0) + 1;
            }
        }
    });

    const dayBuckets = {};
    myBands.forEach(b => {
        if (!dayBuckets[b.DAY]) dayBuckets[b.DAY] = [];
        const range = bandRange(b);
        dayBuckets[b.DAY].push({ ...b, _s: range.start, _e: range.end });
    });

    stats.clashesExtended = [];

    Object.entries(dayBuckets).forEach(([day, bands]) => {
        const timeline = new Map();

        bands.forEach(b => {
            for (let t = b._s; t < b._e; t++) {
                if (!timeline.has(t)) timeline.set(t, []);
                timeline.get(t).push(b);
            }
        });

        const sortedTimes = [...timeline.keys()].sort((a, b) => a - b);
        if (sortedTimes.length === 0) return;

        let currentLevel = 0;
        let segmentStart = -1;
        let currentBands = [];

        const commitSegment = (end) => {
            if (currentLevel >= 2 && end - segmentStart >= 10) {
                stats.clashesExtended.push({
                    day,
                    startTime: segmentStart,
                    endTime: end,
                    level: currentLevel,
                    bands: [...new Set(currentBands)].sort((a, b) => a.GROUPE.localeCompare(b.GROUPE))
                });
            }
        };

        const minT = sortedTimes[0];
        const maxT = sortedTimes[sortedTimes.length - 1];

        for (let t = minT; t <= maxT + 1; t++) {
            const bandsAtT = timeline.get(t) || [];
            const level = bandsAtT.length;

            const sig = bandsAtT.map(b => b.id).sort().join(',');
            const currentSig = currentBands.map(b => b.id).sort().join(',');

            if (level !== currentLevel || sig !== currentSig) {
                commitSegment(t);

                currentLevel = level;
                currentBands = bandsAtT;
                segmentStart = t;
            }
        }
    });

    Object.keys(stats.days).forEach(day => {
        const window = dayWindows[day];
        if (!window) return;

        const totalWindowMinutes = window.end - window.start;

        const dailyBands = myBands.filter(b => b.DAY === day);
        if (dailyBands.length === 0) {
            stats.days[day].completionRate = 0;
            return;
        }

        const intervals = dailyBands.map(b => { const r = bandRange(b); return [r.start, r.end]; }).sort((a, b) => a[0] - b[0]);
        const mergedIntervals = [];
        let [currStart, currEnd] = intervals[0];
        for (let i = 1; i < intervals.length; i++) {
            const [nextStart, nextEnd] = intervals[i];
            if (nextStart < currEnd) {
                currEnd = Math.max(currEnd, nextEnd);
            } else {
                mergedIntervals.push([currStart, currEnd]);
                currStart = nextStart;
                currEnd = nextEnd;
            }
        }
        mergedIntervals.push([currStart, currEnd]);

        const occupiedMinutes = mergedIntervals.reduce((acc, [start, end]) => acc + (end - start), 0);

        // Temps de déplacement entre deux concerts (5 min chacun), compté comme occupé
        const favCount = stats.days[day].count;
        const dayClashes = stats.clashesExtended.filter(c => c.day === day).length;
        const transitionMalus = Math.max(0, (favCount - dayClashes) * 5);

        const freeMinutes = Math.max(0, totalWindowMinutes - occupiedMinutes - transitionMalus);

        stats.days[day].completionRate = Math.round(((totalWindowMinutes - freeMinutes) / totalWindowMinutes) * 100);
    });

    const activeDays = Object.values(stats.days).filter(d => d.count > 0);
    if (activeDays.length > 0) {
        const totalCompletion = activeDays.reduce((sum, d) => sum + (d.completionRate || 0), 0);
        stats.averageCompletion = Math.round(totalCompletion / activeDays.length);
    } else {
        stats.averageCompletion = 0;
    }

    const history = { noms: new Set(), adjs: new Set(), univs: new Set() };
    Object.keys(stats.days).forEach(day => {
        const dailyBands = myBands.filter(b => b.DAY === day);
        const persona = calculateDayPersona(dailyBands, taggedBands, history);

        if (persona.chosen) {
            history.noms.add(persona.chosen.nom);
            history.adjs.add(persona.chosen.adj);
            history.univs.add(persona.chosen.univ);
        }

        stats.days[day].persona = persona;
    });

    stats.rank = RANKS.find(r => stats.averageCompletion >= r.min).label;

    // Classe de la semaine : reflète tous les goûts, sans éviter les mots des titres du jour
    stats.weeklyPersona = calculateDayPersona(myBands, taggedBands);

    return stats;
};

/**
 * Styles reconnus dans la colonne STYLE (en minuscules) : `match` décide si un groupe relève du style.
 * L'ordre des clés départage les égalités de score.
 * Noms, adjectifs et univers épicènes : ils se combinent entre styles sans problème d'accord.
 */
const STYLE_PERSONA = {
    "sludge": {
        "match": /sludge/,
        "noms": ["Prophète"],
        "adjectifs": ["Sale"],
        "univers": ["du Bayou"]
    },
    "death": {
        "match": /death/,
        "noms": ["Goule"],
        "adjectifs": ["Putride"],
        "univers": ["des Catacombes"]
    },
    "metalcore": {
        "match": /metalcore/,
        "noms": ["Adepte"],
        "adjectifs": ["Implacable"],
        "univers": ["de la Nouvelle Vague"]
    },
    "nu": {
        "match": /\bnu\b|trap metal|modern metal/,
        "noms": ["Hybride"],
        "adjectifs": ["Instable"],
        "univers": ["de la Street"]
    },
    "heavy": {
        "match": /heavy/,
        "noms": ["Sentinelle"],
        "adjectifs": ["Inoxydable"],
        "univers": ["de la Forteresse"]
    },
    "punk": {
        "match": /punk|crust|garage|(^|[^a-z])o[iï]!?($|[^a-z])/,
        "noms": ["Punk"],
        "adjectifs": ["Anarchiste"],
        "univers": ["des Bas-Fonds"]
    },
    "hardcore": {
        "match": /hardcore|harcore|nyhc|mathcore|emocore/,
        "noms": ["Rebelle"],
        "adjectifs": ["Indomptable"],
        "univers": ["du Pit"]
    },
    "stoner": {
        "match": /stoner/,
        "noms": ["Nomade"],
        "adjectifs": ["Cosmique"],
        "univers": ["du Désert"]
    },
    "post": {
        "match": /post[\s-]?(metal|rock|black)/,
        "noms": ["Esprit"],
        "adjectifs": ["Atmosphérique"],
        "univers": ["des Brumes"]
    },
    "rock": {
        "match": /rock|grunge/,
        "noms": ["Icône"],
        "adjectifs": ["Électrique"],
        "univers": ["de la Route"]
    },
    "black": {
        "match": /black/,
        "noms": ["Ombre"],
        "adjectifs": ["Funeste"],
        "univers": ["de la Forêt Noire"]
    },
    "folk": {
        "match": /folk/,
        "noms": ["Barde"],
        "adjectifs": ["Antique"],
        "univers": ["des Tavernes"]
    },
    "indus": {
        "match": /indus/,
        "noms": ["Cyborg"],
        "adjectifs": ["Mécanique"],
        "univers": ["de l'Usine"]
    },
    "thrash": {
        "match": /thrash/,
        "noms": ["Bête"],
        "adjectifs": ["Féroce"],
        "univers": ["de la Tempête"]
    },
    "power": {
        "match": /power(?!violence)/,
        "noms": ["Légende"],
        "adjectifs": ["Épique"],
        "univers": ["du Royaume"]
    },
    "prog": {
        "match": /prog/,
        "noms": ["Virtuose"],
        "adjectifs": ["Complexe"],
        "univers": ["du Labyrinthe"]
    },
    "alternatif": {
        "match": /alternatif/,
        "noms": ["Électron Libre"],
        "adjectifs": ["Inclassable"],
        "univers": ["des Chemins de Traverse"]
    },
    "hard": {
        "match": /\bhard\b|glam/,
        "noms": ["Star"],
        "adjectifs": ["Glamour"],
        "univers": ["des Projecteurs"]
    },
    "doom": {
        "match": /doom|funeral/,
        "noms": ["Ascète"],
        "adjectifs": ["Lugubre"],
        "univers": ["du Purgatoire"]
    },
    "grind": {
        "match": /grind|powerviolence/,
        "noms": ["Tronçonneuse"],
        "adjectifs": ["Frénétique"],
        "univers": ["de l'Abattoir"]
    },
    "psyche": {
        "match": /psych/,
        "noms": ["Mystique"],
        "adjectifs": ["Hypnotique"],
        "univers": ["des Songes"]
    },
    "goth": {
        "match": /goth/,
        "noms": ["Vampire"],
        "adjectifs": ["Mélancolique"],
        "univers": ["du Clair de Lune"]
    },
};

const DEFAULT_PERSONA = { title: "Âme Égarée" };

export const calculateDayPersona = (dayBands, taggedBands, history = null) => {
    if (!dayBands || dayBands.length === 0) return DEFAULT_PERSONA;

    const stageCounts = {};
    dayBands.forEach(b => {
        const s = (b.SCENE || "").toUpperCase();
        stageCounts[s] = (stageCounts[s] || 0) + 1;
    });

    const total = dayBands.length;
    const getS = (keys) => keys.reduce((sum, k) => sum + (stageCounts[k] || 0), 0);

    // Titres « priorité » : une scène (ou un pôle) qui concentre plus de 75 % de la journée.
    // Ordre : pôle Mainstages, puis scène seule (sinon son pôle la masquerait toujours), puis autres pôles.
    const STAGE_TITLES = {
        'WARZONE': "Tête Brûlée de la Warzone",
        'RIOT': "Anarchiste du Riot",
        'VALLEY': "Ermite de la Valley",
        'ABYSS': "Créature de l'Abyss",
        'ALTAR': "Bourreau de l'Altar",
        'FORGE': "Enclume de la Forge",
        'TEMPLE': "Disciple du Temple",
        'CRYPT': "Spectre de la Crypt",
    };
    const POLE_TITLES = {
        MS: "Campeur des Mainstages",
        WR: "Squatteur de Warzone/Riot",
        VA: "Valley/Abyss Addict",
        AF: "Inconditionnel d'Altar/Forge",
        TC: "Fidèle de Temple/Crypt",
    };

    let priorityTitle = null;
    const stageHit = Object.keys(STAGE_TITLES).find(k => getS([k]) / total > 0.75);
    if (getS(['MAINSTAGE 1', 'MAINSTAGE 2']) / total > 0.75) priorityTitle = POLE_TITLES.MS;
    else if (stageHit) priorityTitle = STAGE_TITLES[stageHit];
    else {
        const poleHit = POLES.find(p => getS(p.stages) / total > 0.75);
        if (poleHit) priorityTitle = POLE_TITLES[poleHit.id];
    }

    if (priorityTitle) return { title: priorityTitle };

    const scores = {};
    Object.keys(STYLE_PERSONA).forEach(key => scores[key] = 0);

    dayBands.forEach(band => {
        const styleLow = (band.STYLE || "").toLowerCase();
        const interest = taggedBands[band.id]?.interest;
        const weight = interest === 'must_see' ? 3 : interest === 'interested' ? 2 : interest === 'curious' ? 1 : 0;
        if (weight === 0) return;

        Object.entries(STYLE_PERSONA).forEach(([keyword, { match }]) => {
            if (match.test(styleLow)) scores[keyword] += weight;
        });
    });

    const topKeywords = Object.entries(scores)
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a);

    if (topKeywords.length === 0) return DEFAULT_PERSONA;

    const k1 = topKeywords[0][0];
    const k2 = topKeywords.length >= 2 ? topKeywords[1][0] : k1;
    const k3 = topKeywords.length >= 3 ? topKeywords[2][0] : k2;

    const styles = [k1, k2, k3];

    const permutations = [
        [1, 2, 0],
        [0, 2, 1],
        [0, 1, 2],
        [2, 1, 0],
        [1, 0, 2],
        [2, 0, 1]
    ];

    let chosen = null;
    let bestScore = 4;

    for (const p of permutations) {
        const candidate = {
            nom: STYLE_PERSONA[styles[p[0]]].noms[0],
            adj: STYLE_PERSONA[styles[p[1]]].adjectifs[0],
            univ: STYLE_PERSONA[styles[p[2]]].univers[0],
        };

        let dupeScore = 0;
        if (history) {
            if (history.noms.has(candidate.nom)) dupeScore++;
            if (history.adjs.has(candidate.adj)) dupeScore++;
            if (history.univs.has(candidate.univ)) dupeScore++;
        }

        if (dupeScore === 0) {
            chosen = candidate;
            break;
        }

        if (!chosen || dupeScore < bestScore) {
            chosen = candidate;
            bestScore = dupeScore;
        }
    }

    return { title: `${chosen.nom} ${chosen.adj} ${chosen.univ}`, chosen };
};
