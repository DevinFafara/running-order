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
    mapPosition: { left: '30.0%', top: '11.9%' }
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
    mapPosition: { left: '14.7%', top: '43.0%' }
  },
  [STAGES.VALLEY]: {
    name: 'Valley',
    icon: `${import.meta.env.BASE_URL}icons/icon_valley.png`,
    slug: 'valley',
    themeColor: '#ce7c19',
    bandColor: '#eabe97',
    mapPosition: { left: '33.1%', top: '56.6%' }
  },
  [STAGES.ALTAR]: {
    name: 'Altar',
    icon: `${import.meta.env.BASE_URL}icons/icon_altar.png`,
    slug: 'altar',
    themeColor: '#dc2829',
    bandColor: '#f19e9e',
    mapPosition: { left: '51.4%', top: '24.8%' }
  },
  [STAGES.TEMPLE]: {
    name: 'Temple',
    icon: `${import.meta.env.BASE_URL}icons/icon_temple.png`,
    slug: 'temple',
    themeColor: '#93a7b0',
    bandColor: '#cbd4d8',
    mapPosition: { left: '55.2%', top: '28.2%' }
  },
  [STAGES.HELLSTAGE]: {
    name: 'Hellstage',
    icon: `${import.meta.env.BASE_URL}icons/hellStage.png`,
    slug: 'hellstage',
    themeColor: '#239c60',
    bandColor: '#a0d8b7',
    mapPosition: { left: '58.0%', top: '48.7%' }
  },
  [STAGES.METAL_CORNER]: {
    name: 'Metal Corner',
    icon: `${import.meta.env.BASE_URL}icons/metalCorner.png`,
    slug: 'metal_corner',
    themeColor: '#9f9c78',
    bandColor: '#d0cfae',
    mapPosition: { left: '71.3%', top: '65.6%' }
  },
  [STAGES.PURPLE_HOUSE]: {
    name: 'Purple House',
    icon: `${import.meta.env.BASE_URL}icons/purple.png`,
    slug: 'purple_house',
    themeColor: '#9500c6',
    bandColor: '#d6b2e0',
    mapPosition: { left: '70.1%', top: '56.7%' }
  },
  [STAGES.HELLCITY_STAGE]: {
    name: 'Hellcity Brewpub',
    icon: `${import.meta.env.BASE_URL}icons/hellcity-brewpub.png`,
    slug: 'hellcity_stage',
    themeColor: '#c45c00',
    bandColor: '#e8b07a',
    mapPosition: { left: '68.0%', top: '46.0%' }
  },
  [STAGES.LE_OFF1]: {
    name: 'Le Off 1',
    icon: `${import.meta.env.BASE_URL}icons/le_off1.png`,
    slug: 'le_off1',
    themeColor: '#7a1a1a',
    bandColor: '#c47070',
    mapPosition: { left: '88.0%', top: '62.0%' }
  },
  [STAGES.LE_OFF2]: {
    name: 'Le Off 2',
    icon: `${import.meta.env.BASE_URL}icons/le_off2.png`,
    slug: 'le_off2',
    themeColor: '#3a3a3a',
    bandColor: '#8a8a8a',
    mapPosition: { left: '88.0%', top: '70.0%' }
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
  { id: 'poi-tree', name: 'Foret du Muscadet', icon: 'fa-solid fa-tree', mapPosition: { left: '32.3%', top: '41.6%' }, color: '#4CAF50' },
  { id: 'poi-burger', name: 'Food Court', icon: 'fa-solid fa-burger', mapPosition: { left: '38.8%', top: '45.9%' }, color: '#FF9800' },
  { id: 'poi-meteor', name: 'Bar Météore', icon: 'fa-solid fa-meteor', mapPosition: { left: '32.2%', top: '26.1%' }, color: '#9C27B0' },
  { id: 'poi-church', name: 'Cathédrale', icon: 'fa-solid fa-church', mapPosition: { left: '47.6%', top: '41.0%' }, color: '#795548' },
  { id: 'poi-dharma', name: 'Grande Roue', icon: 'fa-solid fa-dharmachakra', mapPosition: { left: '24.1%', top: '33.9%' }, color: '#E91E63' },
  { id: 'poi-cowboy', name: 'Statue de Lemmy', icon: 'fa-solid fa-hat-cowboy', mapPosition: { left: '23.0%', top: '51.9%' }, color: '#8D6E63' },
  { id: 'poi-snowflake', name: 'Hellfresh', icon: 'fa-solid fa-snowflake', mapPosition: { left: '29.1%', top: '48.8%' }, color: '#03A9F4' },
  { id: 'poi-torii', name: 'Murs d’eau', icon: 'fa-solid fa-torii-gate', mapPosition: { left: '32.0%', top: '31.1%' }, color: '#D32F2F' },
  { id: 'poi-fire', name: 'Brasero', icon: 'fa-solid fa-fire', mapPosition: { left: '36.3%', top: '37.8%' }, color: '#FF5722' },
  { id: 'poi-cart', name: 'Xtrem Market', icon: 'fa-solid fa-cart-shopping', mapPosition: { left: '62.1%', top: '54.7%' }, color: '#607D8B' },
  { id: 'poi-bag', name: 'Sanctuary', icon: 'fa-solid fa-bag-shopping', mapPosition: { left: '56.7%', top: '42.0%' }, color: '#607D8B' },
  { id: 'poi-shirt', name: 'Merch Artistes', icon: 'fa-solid fa-shirt', mapPosition: { left: '47.7%', top: '47.5%' }, color: '#607D8B' },
  { id: 'poi-shower', name: 'Douches', icon: 'fa-solid fa-shower', mapPosition: { left: '76.0%', top: '58.7%' }, color: '#2196F3' },
  { id: 'poi-tents', name: 'Campings', icon: 'fa-solid fa-tents', mapPosition: { left: '79.7%', top: '81.0%' }, color: '#795548' },
  { id: 'poi-guitar', name: 'Rond-Point de la Guitare', icon: 'fa-solid fa-guitar', mapPosition: { left: '74.6%', top: '42.9%' }, color: '#FFC107' },
  { id: 'poi-entrance', name: 'Entrée principale', icon: 'fa-solid fa-right-to-bracket', mapPosition: { left: '67.2%', top: '40.7%' }, color: '#4CAF50' },
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
