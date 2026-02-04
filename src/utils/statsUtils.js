
import { STAGE_CONFIG } from '../constants';

// Mots-clés ignorés pour la simplification des styles
const IGNORED_KEYWORDS = ['Metal', 'Rock', 'Core', 'Music'];

// Familles de styles pour le regroupement
const STYLE_FAMILIES = {
    'Death': ['Death', 'Grind', 'Brutal'],
    'Black': ['Black', 'Pagan', 'Viking'],
    'Thrash': ['Thrash', 'Speed'],
    'Heavy': ['Heavy', 'Power', 'NWOBHM', 'Glam'],
    'Hardcore': ['Hardcore', 'Beatdown', 'Punk', 'Ska'],
    'Stoner': ['Stoner', 'Doom', 'Sludge', 'Psych'],
    'Core': ['Metalcore', 'Deathcore', 'Post-Hardcore'],
    'Indus': ['Industrial', 'EBM', 'Cyber'],
    'Prog': ['Progressive', 'Avant-Garde'],
    'Rock': ['Hard Rock', 'Classic Rock', 'Blues', 'Garage'],
};

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
 * Détermine la famille de style dominante
 */
export const getStyleFamily = (detailedStyle) => {
    if (!detailedStyle) return 'Unknown';

    for (const [family, keywords] of Object.entries(STYLE_FAMILIES)) {
        if (keywords.some(k => detailedStyle.includes(k))) {
            return family;
        }
    }
    return detailedStyle.split(' ')[0]; // Fallback
};

/**
 * Analyse les statistiques utilisateur
 */
export const calculateStats = (lineup, taggedBands) => {
    const stats = {
        totalBands: 0,
        effectiveTotal: 0, // Nouveau: total plafonné par jour
        totalMinutes: 0,
        styles: {},
        days: {
            'Jeudi': { count: 0, minutes: 0 },
            'Vendredi': { count: 0, minutes: 0 },
            'Samedi': { count: 0, minutes: 0 },
            'Dimanche': { count: 0, minutes: 0 },
        },
        clashes: [],
        topStyle: 'Hellbanger',
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
            }
        }

        // Style Analysis
        const family = getStyleFamily(group.STYLE);
        stats.styles[family] = (stats.styles[family] || 0) + 1;
    });

    // 1.5 Calcul du Total Effectif (Plafonnement journalier) et Intensité
    Object.entries(stats.days).forEach(([day, data]) => {
        const limit = DAILY_LIMITS[day] || 18; // Fallback à 18 si jour inconnu
        stats.effectiveTotal += Math.min(data.count, limit);

        // Calcul de l'intensité (0 à 100%) basé sur le nombre de concerts vs la limite
        data.intensity = Math.min(100, Math.round((data.count / limit) * 100));
    });

    // 2. Déterminer le Top Style pour le titre
    let maxStyleCount = 0;
    Object.entries(stats.styles).forEach(([style, count]) => {
        if (count > maxStyleCount) {
            maxStyleCount = count;
            stats.topStyle = style + (style.endsWith('s') ? '' : ' Warrior');
        }
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

    // Détermination du Rang
    // 4 paliers : 0-30 (Touriste), 30-60 (Amateur), 60-90 (Hellbanger), 90+ (Trve)
    if (stats.averageCompletion < 30) stats.rank = "Touriste";
    else if (stats.averageCompletion < 60) stats.rank = "Amateur";
    else if (stats.averageCompletion < 90) stats.rank = "Hellbanger";
    else stats.rank = "Trve";

    return stats;
};

/**
 * Génère un titre basé sur le niveau EFFECTIF
 */
export const getLevelTitle = (count) => {
    if (count === 0) return "Touriste";
    if (count < 10) return "Découvreur";
    if (count < 25) return "Amateur éclairé";
    if (count < 40) return "Marathonien";
    if (count < 60) return "Guerrier du Pit";
    return "Légende du Hellfest";
};
