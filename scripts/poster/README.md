# Protocole « affiche → running order »

Construit un running order complet (tous les groupes, scènes, jours et horaires) à partir de l'affiche d'une édition, en quelques minutes, dès sa révélation. Les horaires sont **estimés** à partir de la position sur l'affiche et doivent être remplacés par les horaires officiels quand ils sortent.

## Vue d'ensemble

```
affiche (image) ──► transcription JSON ──► build-lineup.js ──► lineup-2027.json  (app)
                    poster-2027.json        + grille horaire     lineup-2027.csv   (Google Sheet)
                                            slot-grid-2026.json  rapport-2027.md   (à relire)
```

## Étapes

### 1. Grille horaire de référence (une fois par édition source)

```bash
node scripts/poster/extract-slot-grid.js public/lineup.json scripts/poster/slot-grid-2026.json
```

Relève, pour chaque jour et chaque couple de scènes qui alternent (MS1/MS2, Warzone/Valley, Altar/Temple en 2026), la suite des créneaux et la scène qui joue chacun. Le fichier `config-2027.js` indique quel couple 2026 sert de gabarit à chaque pôle 2027 (MS ← MS, Warzone/Riot et Valley/Abyss ← Warzone/Valley, Altar/Forge et Temple/Crypt ← Altar/Temple).

### 2. Transcrire l'affiche en JSON

Format (`poster-2027.json`) : pour chaque jour et chaque scène, la liste des groupes **dans l'ordre de l'affiche** :

- d'abord les logos, du plus gros au plus petit ;
- puis le nom en gras ;
- puis les petites lignes, de gauche à droite et de haut en bas.

```json
{
  "edition": 2027,
  "days": {
    "Jeudi": {
      "MAINSTAGE 1": ["blink-182", "AFI", "Good Charlotte", "Pierce The Veil", "Yellowcard"],
      "TEMPLE": ["Satyricon", { "name": "Blasphemy", "uncertain": true }]
    }
  }
}
```

Un groupe peut être un objet pour préciser : `uncertain` (logo difficile à lire, signalé dans le rapport), `start` / `end` (horaires connus, ex. `"21h00"`), `style`, `country`, `lastVisit`.

La transcription peut se faire à la main ou par Claude. Prompt type à donner avec l'image :

> Transcris cette affiche Hellfest au format de `scripts/poster/poster-2027.json` : pour chaque jour (colonnes) et chaque scène (lignes), la liste des groupes dans l'ordre de l'affiche (logos du plus gros au plus petit, puis ligne en gras, puis petites lignes de gauche à droite et de haut en bas). Marque `"uncertain": true` sur tout logo dont tu n'es pas sûr. Clés de scène : MAINSTAGE 1, MAINSTAGE 2, WARZONE, RIOT, VALLEY, ABYSS, ALTAR, FORGE, TEMPLE, CRYPT.

### 3. Construire le running order

```bash
node scripts/poster/build-lineup.js scripts/poster/poster-2027.json
```

Méthode de placement, scène par scène :

1. On prend les créneaux de la scène dans le gabarit de son pôle.
2. On les classe par **prestige** : le plus long d'abord ; à durée égale, le plus tardif. À Hellfest, la durée d'un set suit très bien l'importance du groupe.
3. Le 1er groupe de l'affiche prend le créneau le plus prestigieux, le 2e le suivant, etc. La tête d'affiche hérite donc du plus long set de la soirée, pas forcément du dernier (en 2026, Bring Me The Horizon jouait avant Alestorm).
4. Si l'affiche compte **moins** de groupes que de créneaux, les créneaux du début de journée sont retirés. S'il y en a **plus**, des créneaux de 30 min sont ajoutés avant le premier concert, en laissant la place à l'autre scène du pôle pour garder l'alternance. Les deux cas sont signalés.
5. Contrôle final : aucun chevauchement entre les deux scènes d'un même pôle.

Champs remplis automatiquement : `STYLE`, `PAYS`, `COUNTRY`, `PARTICIPATIONS` = `???` ; `Bio`, `BIO_EN` = Lorem ipsum ; liens vides ; `id` tiré du registre `ids-2027.json`.

**Identifiants stables.** Les favoris des utilisateurs sont enregistrés par `id`. Le registre `scripts/poster/ids-2027.json` associe chaque nom de groupe (normalisé : sans accents ni ponctuation, en minuscules) à son id, et il est mis à jour à chaque construction : un groupe connu garde son id même si d'autres sont ajoutés, retirés ou déplacés ; un nouveau groupe reçoit le plus grand id + 1 (signalé dans le rapport). Ce fichier se versionne avec le reste et ne se supprime jamais. Si un nom est corrigé (faute de frappe), renommer sa clé dans le registre plutôt que de laisser le script créer un nouvel id.

### 4. Relire le rapport

`scripts/poster/out/rapport-2027.md` : le running order jour par jour et scène par scène, avec le mode de placement de chaque groupe (rang sur l'affiche, ajouté, imposé) et la liste des **points à vérifier** (noms incertains, créneaux ajoutés, chevauchements).

### 5. Publier

- **App (prototype)** : `public/lineup-2027.json` est lu directement tant que `lineup.sheetUrl` est vide dans `src/editions/2027.js`.
- **Google Sheet**, au choix :
  - copier-coller : ouvrir `scripts/poster/out/lineup-2027.tsv` dans VS Code, tout copier, cliquer sur A1 de l'onglet 2027, coller (une valeur par cellule) ;
  - import : Fichier → Importer → Importer un fichier `lineup-2027.csv` → « Remplacer la feuille actuelle », type de séparateur « Virgule ».

  Coller le **CSV** met chaque ligne entière dans la colonne A (le séparateur virgule n'est pas reconnu au collage) : passer par le TSV, par l'import, ou par Données → Scinder le texte en colonnes → Virgule.
  Puis renseigner l'URL publiée du Sheet dans `lineup.sheetUrl`.

## Programmation fictive

`node scripts/generate-fake-lineup-2027.js` génère une affiche inventée (`poster-2027.fake.json`) avec exactement autant de groupes que de créneaux, puis `build-lineup.js` la transforme comme une vraie.
