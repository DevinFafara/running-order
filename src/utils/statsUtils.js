
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

    // 3. Clash Detection (Seulement Must See et Interested pour les clashs "sérieux" ?)
    // Le user n'a pas précisé, mais généralement on s'inquiète des clashs pour les groupes qu'on veut VRAIMENT voir.
    // Je garde 'must_see' uniquement pour éviter le spam, ou j'ajoute 'interested' ?
    // Restons sur 'must_see' pour l'instant pour les "Dilemmes Cruels".
    const mustSeeBands = lineup.filter(group => taggedBands[group.id]?.interest === 'must_see');

    const bandsByDay = {};
    mustSeeBands.forEach(b => {
        if (!bandsByDay[b.DAY]) bandsByDay[b.DAY] = [];
        bandsByDay[b.DAY].push({
            ...b,
            startMin: timeToMinutes(b.DEBUT),
            endMin: timeToMinutes(b.FIN)
        });
    });

    Object.keys(bandsByDay).forEach(day => {
        const bands = bandsByDay[day].sort((a, b) => a.startMin - b.startMin);
        for (let i = 0; i < bands.length; i++) {
            for (let j = i + 1; j < bands.length; j++) {
                const b1 = bands[i];
                const b2 = bands[j];

                // Marge de 10 min
                if (b2.startMin >= b1.endMin - 10) break;

                stats.clashes.push({ band1: b1, band2: b2, day });
            }
        }
    });

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
