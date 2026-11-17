import { POLES } from '../constants';

/**
 * Fenêtre glissante de pôles (DayView mobile portrait).
 * Les pôles forment un cercle : MS → WZ/RT → VY/AB → AL/FG → TP/CR → MS.
 * `offset` = index du premier pôle visible, `size` = nombre de colonnes visibles.
 */
const mod = (n, m) => ((n % m) + m) % m;

export const visiblePoleIndexes = (offset, size) =>
    Array.from({ length: Math.min(size, POLES.length) }, (_, i) => mod(offset + i, POLES.length));

export const normalizeOffset = (offset) => mod(offset || 0, POLES.length);

export const poleIndexOfStage = (stageKey) => POLES.findIndex(p => p.stages.includes(stageKey));

/**
 * Décalage minimal pour rendre un pôle visible :
 * s'il est juste après la fenêtre, on glisse d'un cran à gauche ; juste avant, d'un cran à droite.
 */
export const offsetToShow = (offset, size, poleIndex) => {
    if (poleIndex < 0) return offset;
    const visible = visiblePoleIndexes(offset, size);
    if (visible.includes(poleIndex)) return normalizeOffset(offset);
    const after = mod(poleIndex - (offset + size - 1), POLES.length);
    const before = mod(offset - poleIndex, POLES.length);
    return normalizeOffset(after <= before ? offset + after : offset - before);
};
