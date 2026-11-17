/**
 * Réglages du protocole « affiche → running order » pour l'édition 2027.
 * Les jours et les pôles viennent du fichier d'édition de l'app ; ici on dit seulement
 * quel couple de la grille 2026 sert de gabarit horaire à chaque pôle.
 */
import edition from '../../src/editions/2027.js';

export default {
    edition,
    idStart: edition.idRange.min,
    slotGrid: 'scripts/poster/slot-grid-2026.json',
    // Registre nom de groupe → id, à versionner : garantit que les favoris survivent aux mises à jour
    idRegistry: 'scripts/poster/ids-2027.json',
    // Pôle 2027 → couple 2026 dont on reprend les créneaux (scène 0 du couple = 1re scène du pôle)
    templates: {
        MS: 'MS',
        WR: 'WV',
        VA: 'WV',
        AF: 'AT',
        TC: 'AT',
    },
    output: {
        json: 'public/lineup-2027.json',
        csv: 'scripts/poster/out/lineup-2027.csv',
        tsv: 'scripts/poster/out/lineup-2027.tsv',
        report: 'scripts/poster/out/rapport-2027.md',
    },
};
