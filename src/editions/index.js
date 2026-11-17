import chroma from 'chroma-js';
import { textureBackground } from '../utils/textures';
import edition2027 from './2027';

/** Édition courante : le seul endroit à changer d'une année sur l'autre. */
export const EDITION = edition2027;

const BASE = import.meta.env.BASE_URL;

/** Couleur pastel des cartes groupe, dérivée de la couleur de scène. */
const bandTint = (color) => chroma.mix(color, '#ffffff', 0.55, 'lab').hex();

/** Index des scènes de l'édition, par clé SCENE. */
export const EDITION_STAGES = Object.fromEntries(
    EDITION.stages.map((s) => [s.key, {
        ...s,
        icon: `${BASE}${s.icon}`,
        themeColor: s.color,
        bandColor: bandTint(s.color),
        pole: EDITION.poles.find((p) => p.stages.includes(s.key))?.id || null,
    }])
);

/** Couleurs de scène de l'édition, par clé SCENE. */
export const DEFAULT_STAGE_COLORS = Object.fromEntries(EDITION.stages.map((s) => [s.key, s.color]));

/** Palettes proposées à l'utilisateur ; « Classic » = couleurs de l'édition. */
export const STAGE_PALETTES = [
    { id: 'official', label: 'Officielle', colors: DEFAULT_STAGE_COLORS },
    ...(EDITION.palettes || []),
];

/**
 * Thème de scènes : { [clé SCENE]: { themeColor, bandColor } }, couleurs de l'édition
 * remplacées par celles choisies par l'utilisateur (`overrides`, clé SCENE → hex).
 */
export const buildStageTheme = (overrides = {}) => Object.fromEntries(
    EDITION.stages.map((s) => {
        const color = overrides[s.key] || s.color;
        return [s.key, { themeColor: color, bandColor: bandTint(color) }];
    })
);

const DEFAULT_STAGE_THEME = buildStageTheme();

/** Couleur unie d'un pôle : mélange Lab de ses deux scènes (pas de dérive de teinte sur les gris), pondéré par `colorMix` (0,5 par défaut). */
export const poleColor = (pole, theme = DEFAULT_STAGE_THEME) =>
    chroma.mix(theme[pole.stages[0]].themeColor, theme[pole.stages[1]].themeColor, pole.colorMix ?? 0.5, 'lab').hex();

/** Fond de colonne d'un pôle : couleur du pôle, ou celle de la seule scène visible. */
export const poleBackground = (stageKeys, theme = DEFAULT_STAGE_THEME) => {
    const colors = stageKeys.map((k) => theme[k]?.themeColor).filter(Boolean);
    if (colors.length === 0) return '#333';
    if (colors.length === 1) return colors[0];
    const pole = EDITION.poles.find((p) => stageKeys.every((k) => p.stages.includes(k)));
    return pole ? poleColor(pole, theme) : chroma.mix(colors[0], colors[1], 0.5, 'lab').hex();
};

/**
 * Fond texturé d'une colonne : la texture du pôle (champ `texture` de la config),
 * dans les tons de ses scènes. Une seule scène (vue étendue) : texture du pôle, couleur de la scène.
 */
export const poleTexture = (stageKeys, intensity = EDITION.textures?.intensity ?? 1, theme = DEFAULT_STAGE_THEME) => {
    const base = poleBackground(stageKeys, theme);
    const colors = stageKeys.map((k) => theme[k]?.themeColor).filter(Boolean);
    if (colors.length === 0) return base;
    const pole = EDITION.poles.find((p) => p.stages.includes(stageKeys[0]));
    // Graine dérivée de la 1re scène : chaque colonne a son propre dessin
    const seed = EDITION.stages.findIndex((st) => st.key === stageKeys[0]) + 1;
    return textureBackground(pole?.texture, base, colors[0], colors[1] ?? colors[0], seed, intensity);
};

export const isCurrentEditionId = (id) => {
    const n = Number(id);
    return n >= EDITION.idRange.min && n <= EDITION.idRange.max;
};

/**
 * Effets de fond (textures) : interrupteur commun à toutes les vues, à l'intensité de l'édition.
 * Anciens réglages repris : curseur à 0 ou ancien interrupteur désactivé = effets désactivés.
 */
export const texturesEnabled = (state) =>
    state.textureEffects ?? !(state.textureIntensity === 0 || state.columnTextures === false);
export const textureIntensityOf = (state) => (texturesEnabled(state) ? EDITION.textures.intensity : 0);
