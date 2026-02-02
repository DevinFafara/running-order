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
    icon: 'https://forum.hellfest.fr/uploads/default/original/1X/723469cc76965f666beff04a4024eff673c444f3.png',
    slug: 'mainstage1',
    themeColor: '#0055a5',
    bandColor: '#9eaad3'
  },
  [STAGES.MAINSTAGE_2]: {
    name: 'Mainstage 2',
    icon: 'https://forum.hellfest.fr/uploads/default/original/1X/9ef344af22970ef79d91c1955cd40c2ddaa2b32d.png',
    slug: 'mainstage2',
    themeColor: '#a6a19b',
    bandColor: '#d4d2cf'
  },
  [STAGES.WARZONE]: {
    name: 'Warzone',
    icon: 'https://forum.hellfest.fr/uploads/default/original/1X/fa9236925f7bd4a4f3b5f622071c425c8b1e04f6.png',
    slug: 'warzone',
    themeColor: '#949b1a',
    bandColor: '#cecb93'
  },
  [STAGES.VALLEY]: {
    name: 'Valley',
    icon: 'https://forum.hellfest.fr/uploads/default/original/1X/bd43f51c3f066a6d96df719ec826021c0f5a864d.png',
    slug: 'valley',
    themeColor: '#ce7c19',
    bandColor: '#eabe97'
  },
  [STAGES.ALTAR]: {
    name: 'Altar',
    icon: 'https://forum.hellfest.fr/uploads/default/original/1X/eede00d585209d337e8897aa24cbf0f2255bfdf2.png',
    slug: 'altar',
    themeColor: '#dc2829',
    bandColor: '#f19e9e'
  },
  [STAGES.TEMPLE]: {
    name: 'Temple',
    icon: 'https://forum.hellfest.fr/uploads/default/original/1X/2f6183017decac3885da317500a664a884eccf84.png',
    slug: 'temple',
    themeColor: '#93a7b0',
    bandColor: '#cbd4d8'
  },
  [STAGES.HELLSTAGE]: {
    name: 'Hellstage',
    icon: '/running-order/icons/hellStage.png',
    slug: 'hellstage',
    themeColor: '#239c60',
    bandColor: '#a0d8b7'
  },
  [STAGES.METAL_CORNER]: {
    name: 'Metal Corner',
    icon: '/running-order/icons/metalCorner.png',
    slug: 'metal_corner',
    themeColor: '#9f9c78',
    bandColor: '#d0cfae'
  },
  [STAGES.PURPLE_HOUSE]: {
    name: 'Purple House',
    icon: '/running-order/icons/purple.png',
    slug: 'purple_house',
    themeColor: '#9500c6',
    bandColor: '#d6b2e0'
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
];

export const DAYS = ['Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

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
