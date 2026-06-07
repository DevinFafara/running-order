export const STAGES = {
  MAINSTAGE_1: 'MAINSTAGE 1',
  MAINSTAGE_2: 'MAINSTAGE 2',
  WARZONE: 'WARZONE',
  VALLEY: 'VALLEY',
  ALTAR: 'ALTAR',
  TEMPLE: 'TEMPLE',
  HELLSTAGE: 'HELLSTAGE',
  METAL_CORNER: 'METAL_CORNER',
  PURPLE_HOUSE: 'PURPLE_HOUSE',
  HELLCITY_STAGE: 'HELLCITY_STAGE',
  LE_OFF1: 'LE_OFF1',
  LE_OFF2: 'LE_OFF2',
};

// Groupements pour l'agencement
export const STAGE_PAIRS = [
  { id: 'MS', stages: [STAGES.MAINSTAGE_1, STAGES.MAINSTAGE_2] },
  { id: 'WV', stages: [STAGES.WARZONE, STAGES.VALLEY] },
  { id: 'AT', stages: [STAGES.ALTAR, STAGES.TEMPLE] },
];

export const STAGE_CONFIG = {
  [STAGES.MAINSTAGE_1]: {
    name: 'Mainstage 1',
    icon: `${import.meta.env.BASE_URL}icons/icon_mainstage_1.png`,
    slug: 'mainstage1',
    themeColor: '#0055a5',
    bandColor: '#9eaad3',
    mapPosition: { left: '41.1%', top: '12.6%' }
  },
  [STAGES.MAINSTAGE_2]: {
    name: 'Mainstage 2',
    icon: `${import.meta.env.BASE_URL}icons/icon_mainstage_2.png`,
    slug: 'mainstage2',
    themeColor: '#a6a19b',
    bandColor: '#d4d2cf',
    mapPosition: { left: '35.1%', top: '12.2%' }
  },
  [STAGES.WARZONE]: {
    name: 'Warzone',
    icon: `${import.meta.env.BASE_URL}icons/icon_warzone.png`,
    slug: 'warzone',
    themeColor: '#949b1a',
    bandColor: '#cecb93',
    mapPosition: { left: '8.1%', top: '41.6%' }
  },
  [STAGES.VALLEY]: {
    name: 'Valley',
    icon: `${import.meta.env.BASE_URL}icons/icon_valley.png`,
    slug: 'valley',
    themeColor: '#ce7c19',
    bandColor: '#eabe97',
    mapPosition: { left: '28.9%', top: '60.2%' }
  },
  [STAGES.ALTAR]: {
    name: 'Altar',
    icon: `${import.meta.env.BASE_URL}icons/icon_altar.png`,
    slug: 'altar',
    themeColor: '#dc2829',
    bandColor: '#f19e9e',
    mapPosition: { left: '59.1%', top: '24.7%' }
  },
  [STAGES.TEMPLE]: {
    name: 'Temple',
    icon: `${import.meta.env.BASE_URL}icons/icon_temple.png`,
    slug: 'temple',
    themeColor: '#93a7b0',
    bandColor: '#cbd4d8',
    mapPosition: { left: '63.2%', top: '29.4%' }
  },
  [STAGES.HELLSTAGE]: {
    name: 'Hellstage',
    icon: `${import.meta.env.BASE_URL}icons/hellStage.png`,
    slug: 'hellstage',
    themeColor: '#239c60',
    bandColor: '#a0d8b7',
    mapPosition: { left: '68.9%', top: '53.4%' }
  },
  [STAGES.METAL_CORNER]: {
    name: 'Metal Corner',
    icon: `${import.meta.env.BASE_URL}icons/metalCorner.png`,
    slug: 'metal_corner',
    themeColor: '#9f9c78',
    bandColor: '#d0cfae',
    mapPosition: { left: '84.7%', top: '79.1%' }
  },
  [STAGES.PURPLE_HOUSE]: {
    name: 'Purple House',
    icon: `${import.meta.env.BASE_URL}icons/purple.png`,
    slug: 'purple_house',
    themeColor: '#9500c6',
    bandColor: '#d6b2e0',
    mapPosition: { left: '78.0%', top: '68.8%' }
  },
  [STAGES.HELLCITY_STAGE]: {
    name: 'Hellcity Brewpub',
    icon: `${import.meta.env.BASE_URL}icons/hellcity-brewpub.png`,
    slug: 'hellcity_stage',
    themeColor: '#c45c00',
    bandColor: '#e8b07a',
    mapPosition: { left: '80.6%', top: '53.1%' }
  },
  [STAGES.LE_OFF1]: {
    name: 'Le Off 1',
    icon: `${import.meta.env.BASE_URL}icons/le_off1.png`,
    slug: 'le_off1',
    themeColor: '#7a1a1a',
    bandColor: '#c47070',
    mapPosition: { left: '101.6%', top: '84.3%' }
  },
  [STAGES.LE_OFF2]: {
    name: 'Le Off 2',
    icon: `${import.meta.env.BASE_URL}icons/le_off2.png`,
    slug: 'le_off2',
    themeColor: '#3a3a3a',
    bandColor: '#8a8a8a',
    mapPosition: { left: '101.7%', top: '98.0%' }
  },
};

export const MAIN_STAGES = [
  STAGES.MAINSTAGE_1,
  STAGES.MAINSTAGE_2,
  STAGES.WARZONE,
  STAGES.VALLEY,
  STAGES.ALTAR,
  STAGES.TEMPLE,
];

export const SIDE_STAGES = [
  STAGES.HELLSTAGE,
  STAGES.PURPLE_HOUSE,
  STAGES.METAL_CORNER,
  STAGES.HELLCITY_STAGE,
  STAGES.LE_OFF1,
  STAGES.LE_OFF2,
];

export const MAP_POIS = [
  { id: 'poi-tree', name: 'Foret du Muscadet', icon: 'fa-solid fa-tree', mapPosition: { left: '30.4%', top: '41.4%' }, color: '#4CAF50' },
  { id: 'poi-burger', name: 'Food Court', icon: 'fa-solid fa-burger', mapPosition: { left: '39.3%', top: '48.2%' }, color: '#FF9800' },
  { id: 'poi-meteor', name: 'Bar Météore', icon: 'fa-solid fa-meteor', mapPosition: { left: '35.5%', top: '24.7%' }, color: '#9C27B0' },
  { id: 'poi-church', name: 'Cathédrale', icon: 'fa-solid fa-church', mapPosition: { left: '52.0%', top: '41.7%' }, color: '#795548' },
  { id: 'poi-dharma', name: 'Grande Roue', icon: 'fa-solid fa-dharmachakra', mapPosition: { left: '22.6%', top: '34.9%' }, color: '#E91E63' },
  { id: 'poi-cowboy', name: 'Statue de Lemmy', icon: 'fa-solid fa-hat-cowboy', mapPosition: { left: '16.0%', top: '52.6%' }, color: '#8D6E63' },
  { id: 'poi-snowflake', name: 'Hellfresh', icon: 'fa-solid fa-snowflake', mapPosition: { left: '25.3%', top: '50.4%' }, color: '#03A9F4' },
  { id: 'poi-torii', name: 'Murs d’eau', icon: 'fa-solid fa-torii-gate', mapPosition: { left: '34.2%', top: '28.9%' }, color: '#D32F2F' },
  { id: 'poi-fire', name: 'Brasero', icon: 'fa-solid fa-fire', mapPosition: { left: '38.2%', top: '39.2%' }, color: '#FF5722' },
  { id: 'poi-cart', name: 'Xtrem Market', icon: 'fa-solid fa-cart-shopping', mapPosition: { left: '70.7%', top: '62.1%' }, color: '#607D8B' },
  { id: 'poi-bag', name: 'Sanctuary', icon: 'fa-solid fa-bag-shopping', mapPosition: { left: '64.5%', top: '44.9%' }, color: '#607D8B' },
  { id: 'poi-shirt', name: 'Merch Artistes', icon: 'fa-solid fa-shirt', mapPosition: { left: '50.4%', top: '51.6%' }, color: '#607D8B' },
  { id: 'poi-shower', name: 'Douches', icon: 'fa-solid fa-shower', mapPosition: { left: '90.3%', top: '71.1%' }, color: '#2196F3' },
  { id: 'poi-tents', name: 'Campings', icon: 'fa-solid fa-tents', mapPosition: { left: '85.8%', top: '98.8%' }, color: '#795548' },
  { id: 'poi-guitar', name: 'Rond-Point de la Guitare', icon: 'fa-solid fa-guitar', mapPosition: { left: '91.8%', top: '49.8%' }, color: '#FFC107' },
  { id: 'poi-entrance', name: 'Entrée principale', icon: 'fa-solid fa-right-to-bracket', mapPosition: { left: '81.6%', top: '44.7%' }, color: '#4CAF50' },
  { id: 'poi-at-bar', name: 'Bar Altar/Temple', icon: 'fa-solid fa-beer', mapPosition: { left: '52.5%', top: '35.1%' }, color: '#dfa022' },
  { id: 'poi-wz-bar', name: 'Bar Warzone', icon: 'fa-solid fa-beer', mapPosition: { left: '14.0%', top: '49.7%' }, color: '#dfa022' },
  { id: 'poi-vl-bar', name: 'Bar Valley', icon: 'fa-solid fa-beer', mapPosition: { left: '23.2%', top: '63.7%' }, color: '#dfa022' },
  { id: 'poi-hc-bar', name: 'Bar Hellcity', icon: 'fa-solid fa-beer', mapPosition: { left: '71.8%', top: '45.1%' }, color: '#dfa022' },
  { id: 'poi-mc-bar', name: 'Bar MetalCorner', icon: 'fa-solid fa-beer', mapPosition: { left: '79.1%', top: '80.8%' }, color: '#dfa022' },
  { id: 'poi-esplanade-ms2', name: 'Esplanade MS2', icon: 'fa-solid fa-circle-dot', mapPosition: { left: '28.0%', top: '22.4%' }, color: '#78909C' },
  { id: 'poi-esplanade-ms1', name: 'Esplanade MS1', icon: 'fa-solid fa-circle-dot', mapPosition: { left: '43.2%', top: '23.7%' }, color: '#78909C' },
  { id: 'poi-muscadet-kingdom', name: 'Kingdom of Muscadet', icon: 'fa-solid fa-wine-glass', mapPosition: { left: '20.9%', top: '46.8%' }, color: '#9C27B0' },
  { id: 'poi-esplanade-centrale', name: 'Esplanade centrale', icon: 'fa-solid fa-circle-dot', mapPosition: { left: '45.1%', top: '32.4%' }, color: '#78909C' },
  { id: 'poi-restos-valley', name: 'Restos Valley', icon: 'fa-solid fa-utensils', mapPosition: { left: '16.4%', top: '60.2%' }, color: '#FF9800' },
  { id: 'poi-hellcity-square', name: 'Hellcity Square', icon: 'fa-solid fa-circle-dot', mapPosition: { left: '60.9%', top: '59.2%' }, color: '#78909C' },
  { id: 'poi-restos-mc', name: 'Restos Metal Corner', icon: 'fa-solid fa-utensils', mapPosition: { left: '89.3%', top: '79.4%' }, color: '#FF9800' },
];

export const DAYS = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const DEFAULT_COLORS = {
  color1: "#FFEC61",
  color2: "#8AFF61",
  color3: "#61D6FF",
};

// ============================================
// SYSTÈME DE TAGS À 2 DIMENSIONS
// ============================================

// Dimension 1 : Niveau d'intérêt (exclusif, 0-3 étoiles)
export const INTEREST_LEVELS = {
  must_see: {
    id: 'must_see',
    label: 'Incontournable',
    stars: 3,
    defaultColor: '#FFD700', // Or
    sentiment: 'very_positive',
  },
  interested: {
    id: 'interested',
    label: 'Intéressé',
    stars: 2,
    defaultColor: '#4A90D9', // Bleu
    sentiment: 'positive',
  },
  curious: {
    id: 'curious',
    label: 'Curieux',
    stars: 1,
    defaultColor: '#50C878', // Vert
    sentiment: 'neutral_positive',
  },
};

export const INTEREST_ORDER = ['must_see', 'interested', 'curious'];

// Dimension 2 : Contexte (optionnel, cumulable avec l'intérêt)
export const CONTEXT_TAGS = {
  with_friend: {
    id: 'with_friend',
    label: 'Pour un ami',
    icon: '👥',
    description: 'J\'accompagne quelqu\'un',
  },
  strategic: {
    id: 'strategic',
    label: 'Stratégique',
    icon: '📍',
    description: 'Placement / repos / logistique',
  },
  skip: {
    id: 'skip',
    label: 'À éviter',
    icon: '❌',
    description: 'Je préfère ne pas y aller',
  },
};

export const CONTEXT_ORDER = ['with_friend', 'strategic', 'skip'];

export const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTmGfmaVsqb8_2Ivh5DHxqjhcMnQJb7Tu98XAGaet45tdmA8k9CRpZVNeHGV4PUzyOg97u3PYUQO5Zc/pub?gid=1801148757&single=true&output=csv';
