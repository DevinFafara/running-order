import chroma from 'chroma-js';

/**
 * Textures de fond des colonnes de pôle, générées en SVG et raccordables en mosaïque.
 * Chaque texture reçoit la couleur du pôle (base), les couleurs de ses deux scènes
 * et une intensité globale (k), et renvoie une valeur CSS `background` complète.
 *
 *  - plate    : tôle larmée (acier antidérapant)     (Mainstages)
 *  - camo     : treillis militaire « woodland »      (Warzone / Riot)
 *  - psyche   : vagues psychédéliques années 70      (Valley / Abyss)
 *  - magma    : lac de lave, croûte et fissures      (Altar / Forge)
 *  - stained  : vitrail gothique                      (Temple / Crypt)
 *
 * Toutes les couleurs sont tirées vers la couleur du pôle : `tone(couleur, a)` donne
 * un mélange à a × k (0 = couleur du pôle, 1 = couleur pleine). k vient de la config
 * d'édition (`textures.intensity`) et règle la discrétion de toutes les textures à la fois.
 * Le motif est centré horizontalement dans la colonne.
 */

// Générateur pseudo-aléatoire déterministe (mulberry32) : même graine → même dessin
const rng = (seed) => () => {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const r1 = (n) => Math.round(n * 10) / 10;
const mix = (a, b, t) => chroma.mix(a, b, t, 'lab');
/** Fabrique de teintes rapprochées de la base, pondérées par l'intensité globale k. */
const toner = (base, k) => (color, amount) => mix(base, color, Math.min(1, amount * k)).hex();

/** Courbe fermée lissée (Catmull-Rom → Bézier) passant par les points. */
const smoothClosed = (pts) => {
    const n = pts.length;
    const at = (i) => pts[(i + n) % n];
    let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
        const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
    }
    return `${d}Z`;
};

/** Répète un groupe de tracés sur les 8 tuiles voisines pour un raccord sans couture. */
const tiled = (w, h, inner) => [-w, 0, w].flatMap(dx => [-h, 0, h].map(dy =>
    `<g transform="translate(${dx} ${dy})">${inner}</g>`
)).join('');

const svgOpen = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

// Motif centré horizontalement : symétrique dans la colonne quelle que soit sa largeur
const toBackground = (svg, w, h, base) =>
    `url("data:image/svg+xml,${encodeURIComponent(svg)}") 50% 0 / ${w}px ${h}px repeat, ${base}`;

// ─── Tôle larmée ───────────────────────────────────────────────────────────
/**
 * Plaque d'acier antidérapante : « larmes » allongées en relief, orientées en chevrons
 * alternés. Chaque larme = ombre portée décalée + corps + reflet.
 */
const plate = (base, c1, c2, seed, k) => {
    const tone = toner(base, k);
    const S = 26;
    const shadow = tone(chroma(base).darken(1.4).hex(), 0.55);
    const body = tone(chroma(base).brighten(0.5).hex(), 0.6);
    const shine = tone('#ffffff', 0.28);
    const tear = (cx, cy, angle) => `<g transform="translate(${cx} ${cy}) rotate(${angle})">`
        + `<rect x="-8" y="-2" width="16" height="4.4" rx="2.2" fill="${shadow}" transform="translate(0.9 1.1)"/>`
        + `<rect x="-8" y="-2" width="16" height="4.4" rx="2.2" fill="${body}"/>`
        + `<rect x="-6" y="-1.5" width="12" height="1.2" rx="0.6" fill="${shine}"/>`
        + '</g>';
    const W = S * 2, H = S * 2;
    const inner = tear(S / 2, S / 2, 45) + tear(S * 1.5, S / 2, -45) + tear(S / 2, S * 1.5, -45) + tear(S * 1.5, S * 1.5, 45);
    const svg = svgOpen(W, H) + `<rect width="${W}" height="${H}" fill="${base}"/>` + tiled(W, H, inner) + '</svg>';
    return toBackground(svg, W, H, base);
};

// ─── Treillis militaire « woodland » ───────────────────────────────────────
/** Tache lobée irrégulière, étirée et orientée selon une diagonale dominante. */
const woodlandBlob = (rand, cx, cy, size, stretch, angle) => {
    const n = 18;
    const harm = [2, 3, 4, 5].map(h => ({ h, a: (0.08 + rand() * 0.16) / (h / 2), ph: rand() * Math.PI * 2 }));
    const pts = Array.from({ length: n }, (_, i) => {
        const th = (i / n) * Math.PI * 2;
        let r = 1 + harm.reduce((s, o) => s + o.a * Math.sin(o.h * th + o.ph), 0);
        r *= 0.85 + rand() * 0.3;
        const x = Math.cos(th) * size * r * stretch;
        const y = Math.sin(th) * size * r;
        return [cx + x * Math.cos(angle) - y * Math.sin(angle), cy + x * Math.sin(angle) + y * Math.cos(angle)];
    });
    return smoothClosed(pts);
};

const camo = (base, c1, c2, seed, k) => {
    const tone = toner(base, k);
    const W = 240, H = 240;
    const rand = rng(seed * 7919 + 13);
    const dominant = -0.45;
    const light = tone(mix(c2, '#d9cfa4', 0.35), 0.45);
    const green = tone(mix(c1, '#4b5a2a', 0.45), 0.45);
    const brown = tone(mix(base, '#4a3320', 0.62), 0.5);
    const black = tone(mix(base, '#15150f', 0.88), 0.42);

    const layer = (count, size, stretch, color, jitter = 0.5) => {
        const paths = Array.from({ length: count }, () => {
            const s = size * (0.7 + rand() * 0.6);
            return `<path d="${woodlandBlob(rand, rand() * W, rand() * H, s, stretch * (0.8 + rand() * 0.5), dominant + (rand() - 0.5) * jitter)}"/>`;
        }).join('');
        return `<g fill="${color}">${tiled(W, H, paths)}</g>`;
    };

    const svg = svgOpen(W, H)
        + `<rect width="${W}" height="${H}" fill="${light}"/>`
        + layer(7, 30, 1.9, green)
        + layer(7, 26, 2.1, brown)
        + layer(9, 9, 3.4, black, 0.9)
        + '</svg>';
    return toBackground(svg, W, H, base);
};

// ─── Psychédélique ─────────────────────────────────────────────────────────
/**
 * Vagues fluides années 70 : larges bandes séparées par de fins filets clairs ;
 * la phase glisse en descendant (effet « liquide »), amplitude bornée pour éviter tout croisement.
 */
const psyche = (base, c1, c2, seed, k) => {
    const tone = toner(base, k);
    const W = 200;
    const rand = rng(seed * 31 + 3);
    const tones = [
        tone(chroma(c1).saturate(0.8).hex(), 0.55),
        tone(mix(c2, '#fff3dc', 0.3), 0.5),
        tone(mix(c1, '#7a2e10', 0.5), 0.45),
        tone(chroma(c2).saturate(0.7).hex(), 0.55),
        tone(mix(c1, '#5a1f0a', 0.35), 0.4),
        tone(mix(c2, '#ffd98a', 0.45), 0.5),
    ];
    const filet = tone('#fff6e6', 0.32);
    const widths = [20, 13, 26, 15, 22, 17];
    const bands = tones.flatMap((c, i) => [{ c, w: widths[i] }, { c: filet, w: 4 }]);
    const H = bands.reduce((s, b) => s + b.w, 0);
    const edges = bands.reduce((acc, b) => [...acc, acc[acc.length - 1] + b.w], [0]);

    const a1 = 8, a2 = 3; // (a1 + 2·a2)·2π/H < 1 : pas de croisement
    const ph = rand() * Math.PI * 2;
    const curve = (y0) => Array.from({ length: W / 5 + 1 }, (_, i) => {
        const x = i * 5;
        const t = (x / W) * Math.PI * 2;
        const shift = (y0 / H) * Math.PI * 2;
        return [x, y0 + a1 * Math.sin(t + ph - shift) + a2 * Math.sin(2 * t + ph * 2 + shift * 2)];
    });

    const paths = bands.map((b, i) => {
        const pts = [...curve(edges[i]), ...curve(edges[i + 1]).reverse()];
        return `<path fill="${b.c}" d="M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z"/>`;
    }).join('');

    const svg = svgOpen(W, H) + `<rect width="${W}" height="${H}" fill="${base}"/>` + tiled(W, H, paths) + '</svg>';
    return toBackground(svg, W, H, base);
};

// ─── Outils pour les textures à filtres SVG (lave) ───────────────────────────
/**
 * Ces textures utilisent les filtres SVG (bruit de Perlin feTurbulence, flou, déformation)
 * pour un rendu plus naturel que des formes pleines. Le bruit est « cousu » sur la tuile
 * (stitchTiles) et la région de filtre déborde de la tuile : le raccord reste invisible.
 */
const PAD = 24;
const filterOpen = (id, W, H) =>
    `<filter id="${id}" x="${-PAD}" y="${-PAD}" width="${W + 2 * PAD}" height="${H + 2 * PAD}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">`;
/** Bruit périodique sur la tuile (W × H). */
const noise = (W, H, { type = 'fractalNoise', freq, octaves = 3, seed = 1, result = 'n' }) =>
    `<feTurbulence x="0" y="0" width="${W}" height="${H}" type="${type}" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch" result="${result}"/>`;
/**
 * Calque de grain : rectangle plein de `color` dont l'opacité suit le bruit
 * (alpha = gain × bruit + biais, puis exposant pour durcir le contraste).
 */
const grainLayer = (id, W, H, color, { freq, octaves = 3, seed = 1, gain = 1, bias = 0, exponent = 1, opacity = 1, type = 'fractalNoise' }) =>
    `<defs>${filterOpen(id, W, H)}${noise(W, H, { type, freq, octaves, seed })}`
    + `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${gain} 0 0 0 ${bias}" result="a"/>`
    + `<feComponentTransfer in="a" result="b"><feFuncA type="gamma" amplitude="1" exponent="${exponent}" offset="0"/></feComponentTransfer>`
    + `<feFlood flood-color="${color}"/><feComposite in2="b" operator="in"/></filter></defs>`
    + `<rect width="${W}" height="${H}" fill="#000" filter="url(#${id})" opacity="${opacity}"/>`;

/** Ligne brisée irrégulière (fissure) : marche aléatoire avec dérive d'angle et ramifications. */
const crackPaths = (rand, { count, steps, len, spread, branch, W, H }) => {
    const paths = [];
    const walk = (x, y, angle, n, width) => {
        let d = `M${r1(x)} ${r1(y)}`;
        for (let i = 0; i < n; i++) {
            angle += (rand() - 0.5) * spread;
            const l = len * (0.6 + rand() * 0.8);
            x += Math.cos(angle) * l;
            y += Math.sin(angle) * l;
            d += `L${r1(x)} ${r1(y)}`;
            if (rand() < branch && n - i > 3) walk(x, y, angle + (rand() < 0.5 ? 1 : -1) * (0.6 + rand() * 0.7), Math.floor((n - i) * 0.6), width * 0.6);
        }
        paths.push({ d, width });
    };
    for (let c = 0; c < count; c++) walk(rand() * W, rand() * H, rand() * Math.PI * 2, steps, 1);
    return paths;
};

// ─── Lave ──────────────────────────────────────────────────────────────────
/**
 * Lac de lave vu du dessus : croûte noire figée, découpée en plaques par un réseau
 * de fissures où la lave affleure. Les bords des plaques sont déformés par du bruit
 * (pas de formes trop régulières), la chaleur rayonne autour des fissures (halo flou),
 * quelques plaques fines laissent transparaître la lueur, et la croûte a un grain rocheux.
 */
const magma = (base, c1, c2, seed, k) => {
    const tone = toner(base, k);
    const COLS = 3, ROWS = 5, W = 210, H = 290;
    const cw = W / COLS, ch = H / ROWS;
    const rand = rng(seed * 6007 + 5);

    const crust = tone(mix(c1, '#0a0504', 0.9), 2);
    const crustHi = tone(mix(c1, '#3b2a24', 0.78), 1.7);
    const glow = tone(mix(c1, '#c81d06', 0.5), 1.8);
    const hot = tone(mix(c2, '#ff6a00', 0.75), 1.9);
    const core = tone('#ffd56a', 2);

    // Réseau de fissures = arêtes d'une grille de sommets décalés (périodique sur la tuile)
    const jit = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () =>
        [(rand() - 0.5) * cw * 0.85, (rand() - 0.5) * ch * 0.85]));
    // Rangées décalées d'une demi-plaque une fois sur deux : pas d'alignement en grille
    const vertex = (c, r) => {
        const [jx, jy] = jit[((r % ROWS) + ROWS) % ROWS][((c % COLS) + COLS) % COLS];
        return [c * cw + jx + (((r % 2) + 2) % 2) * cw * 0.5, r * ch + jy];
    };
    let edges = '', warm = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const a = vertex(c, r), b = vertex(c + 1, r), e = vertex(c, r + 1), d = vertex(c + 1, r + 1);
            edges += `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}M${r1(a[0])} ${r1(a[1])}L${r1(e[0])} ${r1(e[1])}`;
            // Plaques redécoupées par une diagonale, une fois sur trois
            if (rand() < 0.5) edges += rand() < 0.5 ? `M${r1(a[0])} ${r1(a[1])}L${r1(d[0])} ${r1(d[1])}` : `M${r1(b[0])} ${r1(b[1])}L${r1(e[0])} ${r1(e[1])}`;
            // Plaque fine : la lueur transparaît au centre
            if (rand() < 0.22) {
                const cx = (a[0] + b[0] + d[0] + e[0]) / 4, cy = (a[1] + b[1] + d[1] + e[1]) / 4;
                warm += `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(cw * 0.32)}" ry="${r1(ch * 0.3)}"/>`;
            }
        }
    }
    const net = tiled(W, H, `<path d="${edges}"/>`);
    const warmTiled = tiled(W, H, warm);
    // Fines craquelures secondaires à l'intérieur des plaques
    const fine = tiled(W, H, crackPaths(rand, { count: 6, steps: 5, len: 9, spread: 1.1, branch: 0.25, W, H })
        .map(p => `<path d="${p.d}"/>`).join(''));

    const svg = svgOpen(W, H)
        + `<defs>${filterOpen('wob', W, H)}${noise(W, H, { freq: '0.04', octaves: 3, seed })}`
        + `<feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter>`
        + `${filterOpen('blur', W, H)}<feGaussianBlur stdDeviation="7"/></filter>`
        + `${filterOpen('soft', W, H)}<feGaussianBlur stdDeviation="2.2"/></filter></defs>`
        + `<rect width="${W}" height="${H}" fill="${crust}"/>`
        + grainLayer('mottle', W, H, crustHi, { freq: '0.02', octaves: 3, seed: seed + 3, gain: 1.6, bias: -0.55, exponent: 1.4, opacity: 0.9 })
        + `<g filter="url(#blur)" fill="${glow}" opacity="0.4">${warmTiled}</g>`
        + `<g filter="url(#wob)" fill="none" stroke-linecap="round" stroke-linejoin="round">`
        + `<g filter="url(#blur)" stroke="${glow}" stroke-width="9" opacity="0.75">${net}</g>`
        + `<g filter="url(#soft)" stroke="${hot}" stroke-width="3.6">${net}</g>`
        + `<g stroke="${core}" stroke-width="1.2">${net}</g>`
        + `<g stroke="${core}" stroke-width="0.6" opacity="0.8">${fine}</g></g>`
        + grainLayer('grain', W, H, '#000', { freq: '0.9', octaves: 1, seed: seed + 7, gain: 1.2, bias: -0.35, exponent: 1, opacity: 0.35 * Math.min(1, k * 2) })
        + '</svg>';
    return toBackground(svg, W, H, base);
};

// ─── Vitrail gothique ──────────────────────────────────────────────────────
/**
 * Fenêtres à arc brisé (lancettes) séparées par des meneaux de pierre ;
 * dans chaque fenêtre, un réseau de losanges sertis de plomb, verres aux teintes variées.
 */
const stained = (base, c1, c2, seed, k) => {
    const tone = toner(base, k);
    const W = 96, H = 164;
    const rand = rng(seed * 4241 + 11);
    const stone = tone(chroma(base).darken(1.1).hex(), 0.6);
    const lead = tone(chroma(base).darken(2.2).hex(), 0.55);
    const glass = [
        tone(c1, 0.6),
        tone(c2, 0.6),
        tone(chroma(c1).brighten(0.8).hex(), 0.45),
        tone(chroma(c2).brighten(0.9).hex(), 0.45),
        tone(mix(c1, '#2a2f6b', 0.4), 0.45),
    ];

    // Lancette centrée dans la tuile : piédroits à x = 8 et 88, naissance de l'arc à y = 62
    const L = 8, R = 88, SPRING = 62, BOTTOM = H - 4, RAD = 58;
    // Arc gauche centré en (L + RAD, SPRING) ; il rejoint l'arc droit au milieu de la baie
    const apexY = SPRING - Math.sqrt(RAD * RAD - ((L + R) / 2 - L - RAD) ** 2);
    const arch = `M${L} ${BOTTOM}L${L} ${SPRING}A${RAD} ${RAD} 0 0 1 ${(L + R) / 2} ${r1(apexY)}A${RAD} ${RAD} 0 0 1 ${R} ${SPRING}L${R} ${BOTTOM}Z`;

    // Réseau de losanges, centré sur l'axe de la fenêtre
    const DX = 20, DY = 26, AXIS = (L + R) / 2;
    const panes = [];
    for (let row = -1; row <= H / (DY / 2) + 1; row++) {
        for (let col = -3; col <= 3; col++) {
            const cx = AXIS + col * DX + (row % 2 ? DX / 2 : 0);
            const cy = row * (DY / 2);
            panes.push({ d: `M${cx} ${cy - DY / 2}L${cx + DX / 2} ${cy}L${cx} ${cy + DY / 2}L${cx - DX / 2} ${cy}Z`, fill: glass[Math.floor(rand() * glass.length)] });
        }
    }

    const svg = svgOpen(W, H)
        + `<defs><clipPath id="w"><path d="${arch}"/></clipPath></defs>`
        + `<rect width="${W}" height="${H}" fill="${stone}"/>`
        + `<g clip-path="url(#w)">${panes.map(p => `<path fill="${p.fill}" d="${p.d}"/>`).join('')}`
        + `<g stroke="${lead}" stroke-width="1.6" fill="none">${panes.map(p => `<path d="${p.d}"/>`).join('')}</g></g>`
        + `<path d="${arch}" fill="none" stroke="${lead}" stroke-width="3"/>`
        + `<line x1="${AXIS}" y1="${r1(apexY) + 4}" x2="${AXIS}" y2="${BOTTOM}" stroke="${lead}" stroke-width="2.4"/>`
        + '</svg>';
    return toBackground(svg, W, H, base);
};

const TEXTURES = { plate, camo, psyche, magma, stained };

const cache = new Map();

/** Fond texturé : `kind` = nom de la texture, sinon couleur unie. `intensity` : 0 (invisible) → 1. */
export const textureBackground = (kind, base, c1, c2 = c1, seed = 1, intensity = 1) => {
    const make = TEXTURES[kind];
    if (!make) return base;
    const key = `${kind}|${base}|${c1}|${c2}|${seed}|${intensity}`;
    if (!cache.has(key)) cache.set(key, make(base, c1, c2, seed, intensity));
    return cache.get(key);
};
