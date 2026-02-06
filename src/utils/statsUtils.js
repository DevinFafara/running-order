
import { STAGE_CONFIG } from '../constants';

// Limites physiques de concerts par jour pour le calcul du niveau
const DAILY_LIMITS = {
    'Jeudi': 10,
    'Vendredi': 18,
    'Samedi': 18,
    'Dimanche': 16
};

/**
 * Convertit une heure "22h30" en minutes depuis 10h00
 */
export const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.replace('h', ':').split(':').map(Number);
    // On considère que la journée commence à 10h. 
    // Les concerts après minuit (00h, 01h, 02h) sont le lendemain.
    let hours = h;
    if (hours < 10) hours += 24;
    return hours * 60 + m;
};

/**
 * Analyse les statistiques utilisateur
 */
export const calculateStats = (lineup, taggedBands) => {
    const stats = {
        totalBands: 0,
        effectiveTotal: 0, // Nouveau: total plafonné par jour
        totalMinutes: 0,
        days: {
            'Jeudi': { count: 0, minutes: 0, stages: {} },
            'Vendredi': { count: 0, minutes: 0, stages: {} },
            'Samedi': { count: 0, minutes: 0, stages: {} },
            'Dimanche': { count: 0, minutes: 0, stages: {} },
        },
        clashes: [],
    };

    if (!lineup || !taggedBands) return stats;

    // Inclusion de 'curious'
    const myBands = lineup.filter(group => {
        const interest = taggedBands[group.id]?.interest;
        return interest === 'must_see' || interest === 'interested' || interest === 'curious';
    });

    // 1. Boucle principale
    myBands.forEach(group => {
        // Basic Stats
        stats.totalBands++;

        const start = timeToMinutes(group.DEBUT);
        const end = timeToMinutes(group.FIN);
        const duration = end - start;

        if (duration > 0) {
            stats.totalMinutes += duration;
            if (stats.days[group.DAY]) {
                stats.days[group.DAY].count++;
                stats.days[group.DAY].minutes += duration;

                // Stage Distribution (using SCENE)
                let stageName = group.SCENE;
                // Try to handle case differences if needed, or just assume consistent data.
                // STAGE_CONFIG uses uppercase keys often in HF apps.
                // But let's verify if we need to map. 
                // We will store the raw name first.
                // Actually, let's normalize to UPPERCASE to match STAGE_CONFIG keys if possible
                // assuming STAGE_CONFIG keys are 'MAINSTAGE 1' etc.
                if (stageName) {
                    const normalized = stageName.toUpperCase();
                    stats.days[group.DAY].stages[normalized] = (stats.days[group.DAY].stages[normalized] || 0) + 1;
                }
            }
        }
        // ...
    });

    // 1.5 Calcul du Total Effectif (Plafonnement journalier) et Intensité
    Object.entries(stats.days).forEach(([day, data]) => {
        const limit = DAILY_LIMITS[day] || 18; // Fallback à 18 si jour inconnu
        stats.effectiveTotal += Math.min(data.count, limit);

        // Calcul de l'intensité (0 à 100%) basé sur le nombre de concerts vs la limite
        data.intensity = Math.min(100, Math.round((data.count / limit) * 100));
    });



    // 3. Clash Detection (Concurrency Based)
    // We use all bands the user has expressed interest in (Must See, Interested, Curious)
    // to match what they see on the Weekly View "Favorites" filter.
    const clashCandidates = myBands;

    // Group by Day
    const dayBuckets = {};
    clashCandidates.forEach(b => {
        if (!dayBuckets[b.DAY]) dayBuckets[b.DAY] = [];
        dayBuckets[b.DAY].push({
            ...b,
            _s: timeToMinutes(b.DEBUT),
            _e: timeToMinutes(b.FIN)
        });
    });

    stats.clashCounts = { 2: 0, 3: 0, 4: 0, 5: 0 };
    stats.clashesExtended = []; // For detailed display

    Object.entries(dayBuckets).forEach(([day, bands]) => {
        // Build Timeline: Minute -> Array of Band IDs
        const timeline = new Map();

        bands.forEach(b => {
            for (let t = b._s; t < b._e; t++) {
                if (!timeline.has(t)) timeline.set(t, []);
                timeline.get(t).push(b);
            }
        });

        const sortedTimes = [...timeline.keys()].sort((a, b) => a - b);
        if (sortedTimes.length === 0) return;

        // Detect Segments
        let currentLevel = 0;
        let segmentStart = -1;
        let currentBands = [];

        // Helper to close segment
        const commitSegment = (end) => {
            if (currentLevel >= 2) {
                const duration = end - segmentStart;
                // Threshold: 10 minutes to be considered a real "Clash"
                if (duration >= 10) {
                    // Update Counts
                    if (!stats.clashCounts[currentLevel]) stats.clashCounts[currentLevel] = 0;
                    stats.clashCounts[currentLevel]++;

                    // Add details
                    stats.clashesExtended.push({
                        day,
                        startTime: segmentStart,
                        endTime: end,
                        level: currentLevel,
                        bands: [...new Set(currentBands)].sort((a, b) => a.GROUPE.localeCompare(b.GROUPE)) // Dedup just in case
                    });
                }
            }
        };

        // Sweep
        // We need to iterate contiguously to detect breaks
        // Min time to Max time + 1
        const minT = sortedTimes[0];
        const maxT = sortedTimes[sortedTimes.length - 1];

        for (let t = minT; t <= maxT + 1; t++) {
            const bandsAtT = timeline.get(t) || [];
            const level = bandsAtT.length;

            // Signature check: level changed OR bands changed?
            // "Simple Clash" definition: N bands play together. 
            // If band A & B play (Level 2). Then band A & C play (Level 2).
            // Is this 1 Simple Clash or 2?
            // Ideally 2 disparate clashes.
            // So we compare the SET of bands.
            // Using IDs string signature.
            const sig = bandsAtT.map(b => b.id).sort().join(',');
            const currentSig = currentBands.map(b => b.id).sort().join(',');

            if (level !== currentLevel || sig !== currentSig) {
                commitSegment(t);

                // Start new
                currentLevel = level;
                currentBands = bandsAtT;
                segmentStart = t;
            }
        }
    });

    // Populate legacy `clashes` for compatibility (using first 2 bands of any clash)
    // Or clear it to force UI update logic?
    // Let's keep it empty and rely on `clashesExtended` in the UI to avoid duplicate data confusion.
    stats.clashes = [];

    // 4. Calcul du taux de complétion (Completion Rate)
    // Basé sur les créneaux horaires "actifs" (Daily Windows)
    const DAILY_WINDOWS = {
        'Jeudi': { start: '16:30', end: '02:05' },    // 9h35 = 575 min
        'Vendredi': { start: '10:30', end: '02:10' }, // 15h40 = 940 min
        'Samedi': { start: '10:30', end: '02:00' },   // 15h30 = 930 min
        'Dimanche': { start: '10:30', end: '00:30' }  // 14h00 = 840 min
    };

    Object.entries(stats.days).forEach(([day, data]) => {
        const window = DAILY_WINDOWS[day];
        if (!window) return;

        const windowStart = timeToMinutes(window.start);
        const windowEnd = timeToMinutes(window.end);
        const totalWindowMinutes = windowEnd - windowStart;

        // Calcul des minutes non occupées par des concerts ("Free Time")
        // On fusionne les intervalles de concerts pour obtenir le temps occupé (Occupied Time)
        // 1. Récupérer les concerts du jour
        const dailyBands = myBands.filter(b => b.DAY === day);
        if (dailyBands.length === 0) {
            stats.days[day].completionRate = 0;
            return;
        }

        // 2. Fusionner les intervalles
        const intervals = dailyBands.map(b => [timeToMinutes(b.DEBUT), timeToMinutes(b.FIN)]).sort((a, b) => a[0] - b[0]);
        let mergedIntervals = [];
        if (intervals.length > 0) {
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
        }

        const occupiedMinutes = mergedIntervals.reduce((acc, [start, end]) => acc + (end - start), 0);

        // 3. Appliquer le "Malus de Transition" (5 min pour bouger entre chaque concert)
        // On soustrait 5 min par groupe favori, SAUF si c'est un clash (déjà compté dans l'occupation ou impossible de bouger)
        const favCount = stats.days[day]?.count || 0;
        const dayClashes = stats.clashesExtended.filter(c => c.day === day).length;
        // On retire les clashs du compte des transitions car on ne bouge pas "plus"
        // On ne peut pas descendre en dessous de 0
        const transitionMalus = Math.max(0, (favCount - dayClashes) * 5);

        // 4. Calcul final
        // Le temps "Libre" réel = Fenêtre Totale - Temps Occupé (Musique) - Temps de Transition (Marche)
        const freeMinutes = Math.max(0, totalWindowMinutes - occupiedMinutes - transitionMalus);

        // Taux de complétion : (Temps Total - Temps Libre) / Temps Total
        // C'est à dire le pourcentage de temps "occupé" (Musique + Marche)
        const completionRate = Math.round(((totalWindowMinutes - freeMinutes) / totalWindowMinutes) * 100);

        console.log(`[Stats DEBUG Day] ${day}:`, {
            totalWindow: totalWindowMinutes,
            occupied: occupiedMinutes,
            transitions: transitionMalus,
            freeTime: freeMinutes,
            rate: completionRate
        });

        stats.days[day].completionRate = completionRate;

        // Optionnel : stocker freeMinutes pour affichage debug ou autre
        stats.days[day].freeMinutes = freeMinutes;
    });

    // 5. Moyenne globale sur les jours ACTIFS seulement
    const activeDays = Object.values(stats.days).filter(d => d.count > 0);
    if (activeDays.length > 0) {
        const totalCompletion = activeDays.reduce((sum, d) => sum + (d.completionRate || 0), 0);
        stats.averageCompletion = Math.round(totalCompletion / activeDays.length);
    } else {
        stats.averageCompletion = 0;
    }

    // 6. Calcul des Personas par jour avec historique pour variété
    const history = { noms: new Set(), adjs: new Set(), univs: new Set() };
    Object.entries(stats.days).forEach(([day, data]) => {
        const dailyBands = myBands.filter(b => b.DAY === day);
        const persona = calculateDayPersona(dailyBands, taggedBands, history);

        // On enregistre les mots choisis dans l'historique pour le jour suivant
        if (persona.chosen) {
            history.noms.add(persona.chosen.nom);
            history.adjs.add(persona.chosen.adj);
            history.univs.add(persona.chosen.univ);
        }

        stats.days[day].persona = persona;
    });

    // Détermination du Rang
    // 4 paliers : 0-30 (Touriste), 30-60 (Amateur), 60-90 (Hellbanger), 90+ (Trve)
    if (stats.averageCompletion < 30) stats.rank = "Touriste";
    else if (stats.averageCompletion < 60) stats.rank = "Amateur";
    else if (stats.averageCompletion < 90) stats.rank = "Hellbanger";
    else stats.rank = "Trve";

    // 7. Calcul du Persona Hebdomadaire (Global)
    // On passe aussi l'historique pour essayer d'avoir un titre hebdomadaire différent des titres journaliers
    stats.weeklyPersona = calculateDayPersona(myBands, taggedBands, history);

    return stats;
};

// ==========================================
// SYSTÈME DE PERSONA JOURNALIER
// ==========================================

const STYLE_PERSONA = {
    "sludge": {
        "noms": ["Prophète"],
        "adjectifs": ["Sale"],
        "univers": ["du Bayou"]
    },
    "death": {
        "noms": ["Goule"],
        "adjectifs": ["Impitoyable"],
        "univers": ["du Chaos"]
    },
    "metalcore": {
        "noms": ["Adepte"],
        "adjectifs": ["Implacable"],
        "univers": ["des Temps Modernes"]
    },
    "nu": {
        "noms": ["Hybride"],
        "adjectifs": ["Instable"],
        "univers": ["de la Street"]
    },
    "heavy": {
        "noms": ["Sentinelle"],
        "adjectifs": ["Immuable"],
        "univers": ["de la Forteresse"]
    },
    "punk": {
        "noms": ["Punk"],
        "adjectifs": ["Irascible"],
        "univers": ["de la Rue"]
    },
    "hardcore": {
        "noms": ["Rebelle"],
        "adjectifs": ["Insoumis"],
        "univers": ["du Pit"]
    },
    "stoner": {
        "noms": ["Nomade"],
        "adjectifs": ["Cosmique"],
        "univers": ["du Désert"]
    },
    "post": {
        "noms": ["Prodige"],
        "adjectifs": ["Onirique"],
        "univers": ["d'Autres Dimensions"]
    },
    "rock": {
        "noms": ["Icône"],
        "adjectifs": ["Électrique"],
        "univers": ["on the road"]
    },
    "black": {
        "noms": ["Ombre"],
        "adjectifs": ["Funeste"],
        "univers": ["de la Forêt Noire"]
    },
    "folk": {
        "noms": ["Barde"],
        "adjectifs": ["Antique"],
        "univers": ["des Tavernes"]
    },
    "indus": {
        "noms": ["Cyborg"],
        "adjectifs": ["Mécanique"],
        "univers": ["de l'Usine"]
    },
    "thrash": {
        "noms": ["Bête"],
        "adjectifs": ["Féroce"],
        "univers": ["de la Tempête"]
    },
    "power": {
        "noms": ["Légende"],
        "adjectifs": ["Épique"],
        "univers": ["de la Légende"]
    },
    "prog": {
        "noms": ["Visionnaire"],
        "adjectifs": ["Intello"],
        "univers": ["du Fractal Infini"]
    },
    "alternatif": {
        "noms": ["Guide"],
        "adjectifs": ["Libre"],
        "univers": ["des Horizons"]
    },
    "hard": {
        "noms": ["Star"],
        "adjectifs": ["Intrépide"],
        "univers": ["du Stade"]
    },
};


/**
 * Calcule le Persona du Jour en fonction des styles écoutés ET des scènes fréquentées
 */
export const calculateDayPersona = (dayBands, taggedBands, history = null) => {
    if (!dayBands || dayBands.length === 0) return { title: "Simple Festivalier", testTitle: "Simple Festivalier", scores: {}, recipe: {} };

    // --- 1. RÈGLES DE PRIORITÉ PAR SCÈNE ---
    const stageCounts = {};
    dayBands.forEach(b => {
        const s = (b.SCENE || "").toUpperCase();
        stageCounts[s] = (stageCounts[s] || 0) + 1;
    });

    const total = dayBands.length;
    const getS = (keys) => keys.reduce((sum, k) => sum + (stageCounts[k] || 0), 0);

    const ms = getS(['MAINSTAGE 1', 'MAINSTAGE 2']);
    const wz = getS(['WARZONE']);
    const vy = getS(['VALLEY']);
    const al = getS(['ALTAR']);
    const te = getS(['TEMPLE']);

    let priorityTitle = null;
    if (ms / total > 0.75) priorityTitle = "Campeur de Mainstage";
    else if (wz / total > 0.75) priorityTitle = "Squatteur de Warzone";
    else if (vy / total > 0.75) priorityTitle = "Ermite de la Valley";
    else if ((wz + vy) / total > 0.75) priorityTitle = "Marginal sympathique";
    else if (al / total > 0.75) priorityTitle = "Résident de l'Altar";
    else if (te / total > 0.75) priorityTitle = "Disciple du Temple";
    else if ((al + te) / total > 0.75) priorityTitle = "Adepte des Tentes";

    if (priorityTitle) {
        return {
            title: priorityTitle,
            testTitle: priorityTitle,
            scores: {},
            recipe: { isPriority: true, name: priorityTitle }
        };
    }

    // --- 2. LOGIQUE DE STYLE (SI PAS DE PRIORITÉ) ---
    const scores = {};
    Object.keys(STYLE_PERSONA).forEach(key => scores[key] = 0);

    dayBands.forEach(band => {
        const styleLow = (band.STYLE || "").toLowerCase();
        const interest = taggedBands[band.id]?.interest;
        let weight = interest === 'must_see' ? 3 : interest === 'interested' ? 2 : interest === 'curious' ? 1 : 0;
        if (weight === 0) return;

        Object.keys(STYLE_PERSONA).forEach(keyword => {
            if (styleLow.includes(keyword)) {
                if (keyword === 'hard' && styleLow.includes('hardcore')) return;
                scores[keyword] += weight;
            }
        });
    });

    const topKeywords = Object.entries(scores)
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a);

    if (topKeywords.length === 0) return { title: "Simple Festivalier", testTitle: "Simple Festivalier", scores: {}, recipe: {} };

    const k1 = topKeywords[0][0]; // 1er
    const k2 = topKeywords.length >= 2 ? topKeywords[1][0] : k1;
    const k3 = topKeywords.length >= 3 ? topKeywords[2][0] : k2;

    const styles = [k1, k2, k3];

    // --- LOGIQUE DE VARIÉTÉ SÉQUENTIELLE ---
    const permutations = [
        [1, 2, 0], // F1: Nom(S2), Adj(S3), Univ(S1)
        [0, 2, 1], // F2: Nom(S1), Adj(S3), Univ(S2)
        [0, 1, 2], // 1-2-3
        [2, 1, 0], // 3-2-1
        [1, 0, 2], // 2-1-3
        [2, 0, 1]  // 3-1-2
    ];

    let chosen = null;
    let bestScore = 4; // Score de doublons (plus bas est mieux)

    for (const p of permutations) {
        const candidate = {
            nom: STYLE_PERSONA[styles[p[0]]].noms[0],
            adj: STYLE_PERSONA[styles[p[1]]].adjectifs[0],
            univ: STYLE_PERSONA[styles[p[2]]].univers[0],
            formula: `${p[0] + 1}-${p[1] + 1}-${p[2] + 1}`
        };

        let dupeScore = 0;
        if (history) {
            if (history.noms.has(candidate.nom)) dupeScore++;
            if (history.adjs.has(candidate.adj)) dupeScore++;
            if (history.univs.has(candidate.univ)) dupeScore++;
        } else {
            dupeScore = 0; // Pas d'histoire = pas de doublon
        }

        // Si on a 0 doublon, c'est parfait, on s'arrête là (séquentiel)
        if (dupeScore === 0) {
            chosen = candidate;
            bestScore = 0;
            break;
        }

        // Sinon on garde la meilleure rencontre pour le moment
        if (!chosen || dupeScore < bestScore) {
            chosen = candidate;
            bestScore = dupeScore;
        }
    }

    const testTitle = `${chosen.nom} ${chosen.adj} ${chosen.univ}`;

    return {
        title: testTitle,
        testTitle: testTitle,
        scores: Object.fromEntries(topKeywords),
        recipe: { nom: chosen.nom, adj: chosen.adj, univ: chosen.univ, formula: chosen.formula },
        chosen
    };
};

/**
 * Génère un titre basé sur le niveau EFFECTIF (Legacy)
 */
export const getLevelTitle = (count) => {
    if (count === 0) return "Touriste";
    if (count < 10) return "Découvreur";
    if (count < 25) return "Amateur éclairé";
    if (count < 40) return "Marathonien";
    if (count < 60) return "Guerrier du Pit";
    return "Légende du Hellfest";
};
