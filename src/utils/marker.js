/**
 * Trait de feutre fluo (style « surligné au marqueur ») pour le nom des groupes favoris.
 * SVG étiré sur chaque ligne du nom (box-decoration-break: clone) : trait large qui déborde du texte,
 * pointe biseautée, encre accumulée aux extrémités et stries claires.
 */
const cache = new Map();

export const markerStroke = (color) => {
    if (cache.has(color)) return cache.get(color);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 20' preserveAspectRatio='none'>`
        // Corps : une couche translucide, pointe biseautée, bords légèrement ondulés, déborde du texte
        + `<path d='M4 3 C16 2 30 2.8 46 2.1 C62 1.4 80 2.2 96.2 1.2 L99.4 18.4 C86 19.2 70 18.4 54 19 C36 19.6 18 18.8 0.8 19.6 Z' fill='${color}' fill-opacity='0.8'/>`
        // Posée du feutre : l'encre s'accumule
        + `<path d='M4 3 L0.8 19.6 L5.2 19.4 C5.6 15 4.6 9 6.4 2.9 Z' fill='${color}' fill-opacity='0.3'/>`
        // Levée du feutre : léger repassage
        + `<path d='M96.2 1.2 L99.4 18.4 L96.8 18.6 C95.6 13 97 7 94.8 1.3 Z' fill='${color}' fill-opacity='0.24'/>`
        // Stries : la pointe dépose moins d'encre par endroits
        + `<path d='M10 7.2 C30 6.8 52 7.4 70 6.9 L70 7.5 C52 8 30 7.5 10 7.8 Z' fill='#fff' fill-opacity='0.09'/>`
        + `<path d='M28 12.6 C50 12.2 72 12.9 93 12.4 L93 13 C72 13.5 50 12.9 28 13.2 Z' fill='#fff' fill-opacity='0.08'/>`
        + `<path d='M6 16 C24 15.7 40 16.2 58 15.9 L58 16.4 C40 16.7 24 16.3 6 16.5 Z' fill='#fff' fill-opacity='0.07'/>`
        + `</svg>`;
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    cache.set(color, url);
    return url;
};
