/**
 * Configuration de l'édition 2027 (prototype).
 *
 * Tout ce qui dépend d'une édition vit ici : dates, jours, scènes, pôles,
 * source de la programmation, carte, libellés. Les composants lisent
 * exclusivement ces valeurs (via src/editions/index.js et src/constants).
 * Pour 2028 : dupliquer ce fichier et changer l'import dans editions/index.js.
 */
const edition = {
    year: 2027,
    label: 'Hellfest 2027',

    // Les ids de la programmation sont préfixés par l'édition (27000 → 27999)
    idRange: { min: 27000, max: 27999 },

    // Seuil unique de bascule de nuit : un horaire avant 6 h appartient à la nuit précédente
    nightCutoffHour: 6,

    days: [
        { key: 'Jeudi', short: 'Jeu', date: '2027-06-17', fallback: { start: 16 * 60, end: 26 * 60 } },
        { key: 'Vendredi', short: 'Ven', date: '2027-06-18', fallback: { start: 10 * 60, end: 26 * 60 } },
        { key: 'Samedi', short: 'Sam', date: '2027-06-19', fallback: { start: 10 * 60, end: 26 * 60 } },
        { key: 'Dimanche', short: 'Dim', date: '2027-06-20', fallback: { start: 10 * 60, end: 25 * 60 } },
    ],
    defaultDay: 'Jeudi',

    // Clé = valeur de la colonne SCENE du Google Sheet
    // color = couleur dominante mesurée sur l'icône officielle
    stages: [
        { key: 'MAINSTAGE 1', name: 'Mainstage 1', short: 'MS1', slug: 'mainstage1', icon: 'icons/2027/mainstage1.png', color: '#817152' },
        { key: 'MAINSTAGE 2', name: 'Mainstage 2', short: 'MS2', slug: 'mainstage2', icon: 'icons/2027/mainstage2.png', color: '#898b8d' },
        { key: 'WARZONE', name: 'Warzone', short: 'WZ', slug: 'warzone', icon: 'icons/2027/warzone.png', color: '#9b9425' },
        { key: 'RIOT', name: 'Riot', short: 'RT', slug: 'riot', icon: 'icons/2027/riot.png', color: '#9a9162' },
        { key: 'VALLEY', name: 'Valley', short: 'VY', slug: 'valley', icon: 'icons/2027/valley.png', color: '#bb7b31' },
        { key: 'ABYSS', name: 'Abyss', short: 'AB', slug: 'abyss', icon: 'icons/2027/abyss.png', color: '#cea26e' },
        { key: 'ALTAR', name: 'Altar', short: 'AL', slug: 'altar', icon: 'icons/2027/altar.png', color: '#ba2b32' },
        { key: 'FORGE', name: 'Forge', short: 'FG', slug: 'forge', icon: 'icons/2027/forge.png', color: '#c35a30' },
        { key: 'TEMPLE', name: 'Temple', short: 'TP', slug: 'temple', icon: 'icons/2027/temple.png', color: '#5564a8' },
        { key: 'CRYPT', name: 'Crypt', short: 'CR', slug: 'crypt', icon: 'icons/2027/crypt.png', color: '#8c8ac0' },
    ],

    // Palettes de scènes proposées dans le panneau Affichage (en plus de « Officiel » = couleurs ci-dessus)
    palettes: [
        {
            // Teintes Okabe-Ito : une teinte par pôle, 1re scène foncée / 2e claire (distinguables par luminosité)
            id: 'cvd', label: 'Daltonisme',
            colors: {
                'MAINSTAGE 1': '#0072b2', 'MAINSTAGE 2': '#56b4e9',
                WARZONE: '#a89a00', RIOT: '#f0e442',
                VALLEY: '#d55e00', ABYSS: '#f0a35e',
                ALTAR: '#8e3b6e', FORGE: '#cc79a7',
                TEMPLE: '#00785a', CRYPT: '#5cc9a7',
            },
        },
    ],

    // Pôles : 2 scènes qui alternent, affichées dans une même colonne. L'ordre est l'ordre du cercle.
    poles: [
        // colorMix : part de la 2e scène dans la couleur de colonne (0,5 = médiane). Mainstages tirées vers MS1.
        // texture : fond de colonne (src/utils/textures.js) — plate, camo, psyche, magma, stained ; absent = couleur unie
        { id: 'MS', name: 'Mainstages', short: 'MS', stages: ['MAINSTAGE 1', 'MAINSTAGE 2'], colorMix: 0.25, texture: 'plate' },
        { id: 'WR', name: 'Warzone / Riot', short: 'WZ/RT', stages: ['WARZONE', 'RIOT'], texture: 'camo' },
        { id: 'VA', name: 'Valley / Abyss', short: 'VY/AB', stages: ['VALLEY', 'ABYSS'], texture: 'psyche' },
        {
            id: 'AF', name: 'Altar / Forge', short: 'AL/FG', stages: ['ALTAR', 'FORGE'], texture: 'magma',
            // Intensité propre à une texture (remplace textures.intensity) : la lave est plus belle discrète
            textureIntensity: { magma: 0.25 },
        },
        { id: 'TC', name: 'Temple / Crypt', short: 'TP/CR', stages: ['TEMPLE', 'CRYPT'], texture: 'stained' },
    ],

    // Textures des colonnes : intensité par défaut (0 = couleur unie, 1 = texture pleine), réglable dans Paramètres
    textures: { intensity: 0.5 },

    // Scènes annexes : aucune info pour 2027, désactivées
    sideStages: [],

    dayView: {
        visiblePolesPortrait: 3,   // colonnes visibles en mobile portrait (glissement en boucle)
        allPolesMinWidth: 800,     // à partir de cette largeur (ou en paysage) : les 5 pôles
        extendedViewMinWidth: 0,    // vue étendue (une colonne par scène) proposée sur tous les écrans
        poleViewHours: false,       // repères horaires dans la vue par pôles (toujours affichés en vue étendue)
        extendedAllMinWidth: 1601,   // vue étendue : toutes les scènes côte à côte à partir de cette largeur…
        extendedSlideColumnWidth: 160, // …en dessous, glissement avec une colonne par tranche de 160 px (3 au minimum)
    },

    lineup: {
        // Onglet « 2027 » du Google Sheet, publié en CSV ; lineup-2027.json sert de secours
        sheetUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTmGfmaVsqb8_2Ivh5DHxqjhcMnQJb7Tu98XAGaet45tdmA8k9CRpZVNeHGV4PUzyOg97u3PYUQO5Zc/pub?gid=1455825122&single=true&output=csv',
        localFile: 'lineup-2027.json',
    },

    map: { enabled: false },

    playlists: [],
};

export default edition;
