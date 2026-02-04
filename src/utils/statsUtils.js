
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

    // 6. Calcul des Personas par jour
    Object.entries(stats.days).forEach(([day, data]) => {
        const dailyBands = myBands.filter(b => b.DAY === day);
        stats.days[day].persona = calculateDayPersona(dailyBands, taggedBands);
    });

    // Détermination du Rang
    // 4 paliers : 0-30 (Touriste), 30-60 (Amateur), 60-90 (Hellbanger), 90+ (Trve)
    if (stats.averageCompletion < 30) stats.rank = "Touriste";
    else if (stats.averageCompletion < 60) stats.rank = "Amateur";
    else if (stats.averageCompletion < 90) stats.rank = "Hellbanger";
    else stats.rank = "Trve";

    return stats;
};

// ==========================================
// SYSTÈME DE PERSONA JOURNALIER
// ==========================================

const STYLE_PERSONA = {
    "punk": {
        "noms": ["Rebelle", "Émeutier", "Outsider"],
        "adjectifs": ["Furieux", "Sale", "Insoumis"],
        "univers": ["de la Rue", "du Squat", "de l'Underground"]
    },
    "hardcore": {
        "noms": ["Guerrier", "Forcené", "Survivant"],
        "adjectifs": ["Brutal", "Inflexible", "Radical"],
        "univers": ["de la Zone", "de la Cave", "de l'Arène"]
    },
    "sludge": {
        "noms": ["Marcheur", "Prêcheur", "Fantôme"],
        "adjectifs": ["Poisseux", "Lourd", "Marécageux"],
        "univers": ["du Bayou", "du Marais", "des Abysses"]
    },
    "stoner": {
        "noms": ["Voyageur", "Rêveur", "Nomade"],
        "adjectifs": ["Cosmique", "Embrumé", "Psychédélique"],
        "univers": ["du Désert", "de l'Espace", "de l'Infini"]
    },
    "post": {
        "noms": ["Explorateur", "Bâtisseur", "Passeur"],
        "adjectifs": ["Atmosphérique", "Éthéré", "Mélancolique"],
        "univers": ["des Horizons", "des Ruines", "d'Autres Dimensions"]
    },
    "rock": {
        "noms": ["Rôdeur", "Leader", "Performer"],
        "adjectifs": ["Brûlant", "Charismatique", "Électrique"],
        "univers": ["de la Scène", "de la Route", "du Bar Enfumè"]
    },
    "black": {
        "noms": ["Sorcier", "Ermite", "Prophète"],
        "adjectifs": ["Glacial", "Blasphématoire", "Sombre"],
        "univers": ["de la Forêt Noire", "du Nord", "de l'Enfer"]
    },
    "folk": {
        "noms": ["Conteur", "Barde", "Voyageur"],
        "adjectifs": ["Ancien", "Rustique", "Authentique"],
        "univers": ["des Montagnes", "du Village", "des Chemins"]
    },
    "indus": {
        "noms": ["Architecte", "Cyborg", "Opérateur"],
        "adjectifs": ["Mécanique", "Froid", "Dystopique"],
        "univers": ["de l'Usine", "de la Mégapole", "du Réseau"]
    },
    "death": {
        "noms": ["Bourreau", "Nécromancien", "Destructeur"],
        "adjectifs": ["Mortel", "Sanglant", "Impitoyable"],
        "univers": ["des Catacombes", "des Ruines", "des Enfers"]
    },
    "thrash": {
        "noms": ["Furieux", "Chasseur", "Dévastateur"],
        "adjectifs": ["Rapide", "Tranchant", "Violent"],
        "univers": ["de la Tempête", "de la Zone Rouge", "du Chaos"]
    },
    "heavy": {
        "noms": ["Chevalier", "Champion", "Gardien"],
        "adjectifs": ["Épique", "Puissant", "Majestueux"],
        "univers": ["de la Forteresse", "du Royaume", "du Valhalla"]
    },
    "metalcore": {
        "noms": ["Combattant", "Résistant", "Leader"],
        "adjectifs": ["Moderne", "Explosif", "Torturé"],
        "univers": ["du Front", "de l'Arène", "du Bunker"]
    },
    "nu": {
        "noms": ["Provocateur", "Hybride", "Outsider"],
        "adjectifs": ["Instable", "Déchaîné", "Brisé"],
        "univers": ["de la Banlieue", "du Terrain Vague", "de la Zone Grise"]
    },
    "power": {
        "noms": ["Héros", "Paladin", "Champion"],
        "adjectifs": ["Lumineux", "Glorieux", "Vaillant"],
        "univers": ["des Cieux", "des Légendes", "du Sacré"]
    },
    "grunge": {
        "noms": ["Paumé", "Solitaire", "Poète"],
        "adjectifs": ["Désabusé", "Sale", "Nostalgique"],
        "univers": ["du Garage", "de la Pluie", "du Vide"]
    },
    "prog": {
        "noms": ["Architecte", "Alchimiste", "Visionnaire"],
        "adjectifs": ["Complexe", "Cérébral", "Mystique"],
        "univers": ["du Labyrinthe", "de l'Esprit", "du Fractal"]
    },
    "alternatif": {
        "noms": ["Curieux", "Explorateur", "Expérimentateur"],
        "adjectifs": ["Libre", "Créatif", "Hybride"],
        "univers": ["des Zones Libres", "des Réseaux", "de l'Ombre"]
    },
    "hard": {
        "noms": ["Rider", "Rocker", "Performer"],
        "adjectifs": ["Bruyant", "Direct", "Brûlant"],
        "univers": ["de l'Autoroute", "du Stade", "du Club"]
    }
};

/**
 * Calcule le Persona du Jour en fonction des styles écoutés
 */
export const calculateDayPersona = (dayBands, taggedBands) => {
    const scores = {};

    // Initialiser scores
    Object.keys(STYLE_PERSONA).forEach(key => scores[key] = 0);

    // Calculer les scores
    dayBands.forEach(band => {
        const styleLow = (band.STYLE || "").toLowerCase();

        // Obtenir poids de l'intérêt
        const interest = taggedBands[band.id]?.interest;
        let weight = 0;
        if (interest === 'must_see') weight = 3;
        else if (interest === 'interested') weight = 2;
        else if (interest === 'curious') weight = 1;

        if (weight === 0) return;

        // Chercher mots clés
        Object.keys(STYLE_PERSONA).forEach(keyword => {
            if (styleLow.includes(keyword)) {
                // Éviter faux positif pour "hard" (ne pas matcher "hardcore")
                if (keyword === 'hard' && styleLow.includes('hardcore')) return;

                scores[keyword] += weight;
            }
        });
    });

    // Trier les mots clés par score décroissant
    const topKeywords = Object.entries(scores)
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a);

    // Générer titre
    let title = "Simple Festivalier";

    if (topKeywords.length >= 1) {
        const k1 = topKeywords[0][0]; // Top 1
        // Random pick pour variété (optionnel, ici on prend index 0 pour stabilité)
        const nom = STYLE_PERSONA[k1].noms[0];

        if (topKeywords.length >= 2) {
            const k2 = topKeywords[1][0];
            const adj = STYLE_PERSONA[k2].adjectifs[0];

            if (topKeywords.length >= 3) {
                const k3 = topKeywords[2][0];
                const univers = STYLE_PERSONA[k3].univers[0];
                // Titre Full: Nom 1 + Adj 2 + Univers 3
                title = `${nom} ${adj} ${univers}`;
            } else {
                // Titre Duo: Nom 1 + Adj 2
                title = `${nom} ${adj}`;
            }
        } else {
            // Titre Solo: Nom 1 + Univers 1
            const univers = STYLE_PERSONA[k1].univers[0];
            title = `${nom} ${univers}`;
        }
    }

    return { title, scores: Object.fromEntries(topKeywords) };
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
