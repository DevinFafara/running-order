import React, { useEffect, useRef, useState } from 'react';
import { markerStroke } from '../../utils/marker';
import { useCheckedState } from '../../context/CheckedStateContext';
import { INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS, CONTEXT_ORDER, POLES, STAGE_CONFIG } from '../../constants';
import { EDITION, STAGE_PALETTES, texturesEnabled } from '../../editions';
import FloatingCard from '../common/FloatingCard';
import { useFestivalNow } from '../../context/FestivalClockContext';
import { localDateKey } from '../../utils/time';

// Façons de faire ressortir les favoris dans la DayView
const FAVORITE_STYLES = [
    { id: 'star', label: 'Étoile' },
    { id: 'marker', label: 'Surligneur' },
    { id: 'spotlight', label: 'Projecteur' },
];

const TABS = [
    { id: 'favorites', icon: 'fa-solid fa-star', label: 'Favoris' },
    { id: 'scenes', icon: 'fa-solid fa-palette', label: 'Scènes' },
    { id: 'columns', icon: 'fa-solid fa-table-columns', label: 'Colonnes' },
    { id: 'filters', icon: 'fa-solid fa-filter', label: 'Filtres' },
];
const ICONS_TAB = { id: 'icons', icon: 'fa-solid fa-map', label: 'Carte' };
// Outils de développement (simulateur d'heure) : absents du build de production
const DEV_TAB = { id: 'dev', icon: 'fa-solid fa-flask', label: 'Dev' };
const IS_DEV = import.meta.env.DEV;

// Simulateur : jours de l'édition + lendemain du dernier jour (post-minuit et fin d'édition)
const SIM_DATE_OPTIONS = (() => {
    const label = (iso, short) => `${short} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
    const [y, m, d] = EDITION.days[EDITION.days.length - 1].date.split('-').map(Number);
    const after = localDateKey(new Date(y, m - 1, d + 1));
    return [
        ...EDITION.days.map(day => ({ value: day.date, label: label(day.date, day.short) })),
        { value: after, label: label(after, 'Lun') },
    ];
})();
const DEFAULT_SIM_MINUTES = 15 * 60;

const Toggle = ({ icon, title, desc, checked, onChange }) => (
    <label className="settings-option">
        <div className="settings-option-info">
            <i className={icon}></i>
            <div>
                <span className="settings-option-title">{title}</span>
                {desc && <span className="settings-option-desc">{desc}</span>}
            </div>
        </div>
        <div className="toggle-switch">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <span className="toggle-slider"></span>
        </div>
    </label>
);

/**
 * Sélecteur de couleur qui n'applique la couleur qu'à la validation (événement natif `change`) :
 * l'`onChange` de React suit chaque mouvement du curseur et régénérerait les textures en continu.
 */
const StageColorInput = ({ value, onCommit, label }) => {
    const ref = useRef(null);
    useEffect(() => {
        const input = ref.current;
        const handle = () => onCommit(input.value);
        input.addEventListener('change', handle);
        return () => input.removeEventListener('change', handle);
    }, [onCommit]);
    // key = valeur : resynchronise l'input quand une palette change la couleur
    return <input key={value} ref={ref} type="color" defaultValue={value} className="color-picker" aria-label={label} />;
};

/**
 * Options d'affichage d'une vue (DayView, WeeklyView), en carte flottante : la vue reste visible et suit chaque réglage.
 *  - view : 'day' | 'weekly' | 'map' (carte : onglets Scènes et Dev seulement)
 *  - sceneFilter : filtre de scènes propre à la vue { isOn(key), toggle(key), setAll(on), extras: [{ key, name, color }] } ;
 *    par défaut, les scènes visibles de la DayView (état global)
 *  - mapOptions : réglages propres à la carte { zoom, canZoomIn, canZoomOut, zoomIn(), zoomOut() }
 *  - weeklyOptions : réglages propres à la WeeklyView { filterMode, colorMode, layout, dayWidth, selectedInterests,
 *    selectedContexts, toggleInterest, toggleContext, set(clé d'état, valeur) }
 */
const DisplayPanel = ({ position, onClose, view = 'day', sceneFilter = null, weeklyOptions = null, mapOptions = null }) => {
    const { state, setState, getInterestColor, setInterestColor, resetInterestColors, stageTheme, setStageColor, setStageColors, toggleScene, setScenes } = useCheckedState();
    const { sim, setSim } = useFestivalNow();
    const tabs = [
        // Carte : onglet Icônes à la place de Colonnes
        ...(view === 'map' ? [TABS[0], TABS[1], ICONS_TAB, TABS[3]] : TABS),
        ...(IS_DEV ? [DEV_TAB] : []),
    ];
    const [tab, setTab] = useState(tabs[0].id);
    const simMinutes = sim?.minutes ?? DEFAULT_SIM_MINUTES;
    const setSimTime = (hours, minutes) => setSim({ ...sim, minutes: hours * 60 + minutes });
    const set = (key, value) => setState(prev => ({ ...prev, [key]: value }));
    // Réglage commun à la DayView et à la WeeklyView
    const dimPastToggle = (
        <Toggle
            icon="fa-solid fa-clock-rotate-left"
            title="Estomper les concerts terminés"
            desc="Pendant le festival, les concerts déjà joués passent au second plan"
            checked={!!state.dimPastBands}
            onChange={(v) => set('dimPastBands', v)}
        />
    );
    // Style des favoris : réglage propre à chaque vue (DayView : favoriteStyle, WeeklyView : weeklyFavoriteStyle)
    // (carte : mapFavoriteStyle, appliqué seulement au programme d'une scène)
    const favStyleKey = view === 'weekly' ? 'weeklyFavoriteStyle' : view === 'map' ? 'mapFavoriteStyle' : 'favoriteStyle';
    // Par défaut : étoile dans la DayView, projecteur dans la WeeklyView
    const favoriteStyle = state[favStyleKey] || (view === 'weekly' ? 'spotlight' : 'star');

    const canUseExtendedView = window.innerWidth >= EDITION.dayView.extendedViewMinWidth;
    const isExtendedView = !state.compact && canUseExtendedView;


    const isPaletteActive = (palette) => EDITION.stages.every(
        st => stageTheme[st.key].themeColor.toLowerCase() === palette.colors[st.key].toLowerCase()
    );
    // « Officiel » = pas de surcharge (suit les couleurs de l'édition)
    const applyPalette = (palette) => setStageColors(palette.id === 'official' ? {} : palette.colors);

    // Filtres : scènes visibles (dans l'ordre des pôles, 2 par ligne = 1 pôle par ligne)
    const filter = sceneFilter || {
        isOn: (key) => state.scenes[STAGE_CONFIG[key].slug] !== false,
        toggle: (key) => toggleScene(STAGE_CONFIG[key].slug),
        setAll: (on) => setScenes(Object.fromEntries(EDITION.stages.map(st => [st.slug, on]))),
        extras: [],
    };
    const stageItem = (key) => ({ key, name: STAGE_CONFIG[key].name, color: stageTheme[key].themeColor });
    const filterItems = [...EDITION.stages.map(st => stageItem(st.key)), ...(filter.extras || [])];
    const allScenesOn = filterItems.every(item => filter.isOn(item.key));
    // Couple (pôle) : tout allumer s'il manque une scène, sinon tout éteindre
    const togglePole = (pole) => {
        const target = !pole.stages.every(k => filter.isOn(k));
        pole.stages.forEach(k => { if (filter.isOn(k) !== target) filter.toggle(k); });
    };
    const renderFilterItem = (item) => {
        const on = filter.isOn(item.key);
        return (
            <label
                key={item.key}
                className={`filter-scene-item ${on ? 'active' : ''}`}
                style={{ '--scene-color': item.color, backgroundColor: on ? item.color : 'rgba(255, 255, 255, 0.05)' }}
            >
                <input type="checkbox" checked={on} onChange={() => filter.toggle(item.key)} />
                <span className="filter-scene-name">{item.name}</span>
                <i className={`fa-solid ${on ? 'fa-eye' : 'fa-eye-slash'}`}></i>
            </label>
        );
    };

    return (
        <FloatingCard
            color="#3a3a40"
            title={<><i className="fa-solid fa-gear" style={{ marginRight: '8px' }}></i>Affichage</>}
            onClose={onClose}
            position={position}
            tabs={tabs}
            activeTab={tab}
            onTabChange={setTab}
            contentKey={tab}
        >
            <div style={{ padding: '6px 4px' }}>
                {tab === 'favorites' && weeklyOptions && (
                    <div className="settings-section">
                        <h3>Groupes affichés</h3>
                        <div className="language-options" role="radiogroup" aria-label="Groupes affichés">
                            {[['favorites', 'Mes favoris'], ['all', 'Tous les groupes']].map(([id, label]) => (
                                <button
                                    key={id}
                                    role="radio"
                                    aria-checked={weeklyOptions.filterMode === id}
                                    className={`language-btn${weeklyOptions.filterMode === id ? ' active' : ''}`}
                                    onClick={() => weeklyOptions.set('weeklyFilterMode', id)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Filtres par niveau d'intérêt et par contexte (mode « Les favoris ») */}
                        {weeklyOptions.filterMode === 'favorites' && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                                {[
                                    ...INTEREST_ORDER.map(id => ({
                                        id, on: weeklyOptions.selectedInterests.includes(id), toggle: weeklyOptions.toggleInterest,
                                        label: INTEREST_LEVELS[id].label,
                                        icon: <span style={{ color: getInterestColor(id) }}>★</span>,
                                    })),
                                    ...CONTEXT_ORDER.map(id => ({
                                        id, on: weeklyOptions.selectedContexts.includes(id), toggle: weeklyOptions.toggleContext,
                                        label: CONTEXT_TAGS[id].label,
                                        icon: CONTEXT_TAGS[id].icon,
                                    })),
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        className={`language-btn${item.on ? ' active' : ''}`}
                                        onClick={() => item.toggle(item.id)}
                                        aria-pressed={item.on}
                                        aria-label={item.label}
                                        title={item.label}
                                        style={{ padding: '6px 0', fontSize: '1.1em', opacity: item.on ? 1 : 0.4 }}
                                    >
                                        {item.icon}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'favorites' && (
                    <div className="settings-section">
                        <h3>Mise en avant</h3>
                        <div className="fav-style-picker" role="radiogroup" aria-label="Mise en avant des favoris">
                            {FAVORITE_STYLES.map(opt => {
                                const active = favoriteStyle === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        role="radio"
                                        aria-checked={active}
                                        className={`fav-style-option${active ? ' active' : ''}`}
                                        onClick={() => set(favStyleKey, opt.id)}
                                        style={{ '--fav-color': getInterestColor('must_see') }}
                                    >
                                        <span className={`fav-style-preview preview-${opt.id}`}>
                                            <span className="preview-card dim" />
                                            <span className="preview-card fav">
                                                {opt.id === 'star' && <span className="preview-star-icon">★</span>}
                                                <span className="preview-name" style={opt.id === 'marker' ? { backgroundImage: markerStroke(getInterestColor('must_see')) } : undefined}>GOJIRA</span>
                                            </span>
                                            <span className="preview-card dim" />
                                        </span>
                                        <span className="fav-style-label">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="settings-section-header">
                            <h3>Couleurs</h3>
                            <button className="settings-reset-btn" onClick={resetInterestColors}>
                                Couleurs par défaut
                            </button>
                        </div>
                        <div className="color-options">
                            {INTEREST_ORDER.map(levelId => {
                                const currentColor = getInterestColor(levelId);
                                return (
                                    <div key={levelId} className="color-option">
                                        <div className="color-option-info">
                                            <span className="color-preview-star" style={{ color: currentColor }}>★</span>
                                            <span className="color-option-label">{INTEREST_LEVELS[levelId].label}</span>
                                        </div>
                                        <input
                                            type="color"
                                            value={currentColor}
                                            onChange={(e) => setInterestColor(levelId, e.target.value)}
                                            className="color-picker"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {tab === 'scenes' && (
                    <div className="settings-section">
                        <h3>Couleurs des scènes</h3>
                        <div className="language-options" role="radiogroup" aria-label="Palette des scènes" style={{ marginBottom: '12px' }}>
                            {STAGE_PALETTES.map(palette => {
                                const active = isPaletteActive(palette);
                                return (
                                    <button
                                        key={palette.id}
                                        role="radio"
                                        aria-checked={active}
                                        className={`language-btn${active ? ' active' : ''}`}
                                        onClick={() => applyPalette(palette)}
                                        style={{ padding: '8px 6px' }}
                                    >
                                        <span style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginBottom: '6px' }}>
                                            {EDITION.stages.map(st => (
                                                <span key={st.key} style={{ width: '8px', height: '14px', borderRadius: '2px', background: palette.colors[st.key] }} />
                                            ))}
                                        </span>
                                        {palette.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Une ligne par pôle : ses 2 scènes côte à côte */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {POLES.flatMap(pole => pole.stages).map(key => (
                                <div key={key} className="color-option" style={{ padding: '6px 10px' }}>
                                    <span className="color-option-label" style={{ fontSize: '0.85em' }}>{STAGE_CONFIG[key].name}</span>
                                    <StageColorInput
                                        value={stageTheme[key].themeColor}
                                        onCommit={(color) => setStageColor(key, color)}
                                        label={`Couleur de ${STAGE_CONFIG[key].name}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Effets de fond : vues qui ont des fonds texturés (colonnes de la DayView) */}
                {tab === 'scenes' && view === 'day' && (
                    <div className="settings-section">
                        <Toggle
                            icon="fa-solid fa-wand-magic-sparkles"
                            title="Textures de fond"
                            desc="Motif propre à chaque couple de scènes"
                            checked={texturesEnabled(state)}
                            onChange={(v) => set('textureEffects', v)}
                        />
                    </div>
                )}

                {tab === 'scenes' && weeklyOptions && (
                    <div className="settings-section">
                        <h3>Style des cartes</h3>
                        <div className="language-options" role="radiogroup" aria-label="Style des cartes">
                            {[['scene', 'Couleur de scène'], ['transparent', 'Sombre'], ['light', 'Clair']].map(([id, label]) => (
                                <button
                                    key={id}
                                    role="radio"
                                    aria-checked={weeklyOptions.colorMode === id}
                                    className={`language-btn${weeklyOptions.colorMode === id ? ' active' : ''}`}
                                    onClick={() => weeklyOptions.set('weeklyColorMode', id)}
                                    style={{ padding: '10px 6px', fontSize: '0.85em' }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'columns' && weeklyOptions && (
                    <>
                        <div className="settings-section">
                            <Toggle
                                icon="fa-solid fa-arrow-down-up-across-line"
                                title="Matin en haut"
                                desc="Les premiers concerts de la journée en haut de la colonne"
                                checked={weeklyOptions.reverse}
                                onChange={(v) => weeklyOptions.set('weeklyReverse', v)}
                            />
                            {dimPastToggle}
                        </div>

                        <div className="settings-section">
                            <h3>Disposition des favoris</h3>
                            <div className="language-options" role="radiogroup" aria-label="Disposition des favoris">
                                {[['optimized', 'Pleine largeur'], ['grid', 'Alignés par scène']].map(([id, label]) => (
                                    <button
                                        key={id}
                                        role="radio"
                                        aria-checked={weeklyOptions.layout === id}
                                        disabled={weeklyOptions.filterMode !== 'favorites'}
                                        className={`language-btn${weeklyOptions.layout === id ? ' active' : ''}`}
                                        onClick={() => weeklyOptions.set('weeklyLayout', id)}
                                        style={weeklyOptions.filterMode !== 'favorites' ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <p className="settings-option-desc" style={{ marginTop: '8px' }}>
                                {weeklyOptions.filterMode !== 'favorites'
                                    ? 'Disponible avec « Mes favoris » (onglet Favoris).'
                                    : weeklyOptions.layout === 'grid'
                                        ? 'Chaque favori à la place de sa scène.'
                                        : 'Les favoris se partagent toute la largeur de la journée.'}
                            </p>
                        </div>

                        {/* Sur mobile, une seule journée par rangée quelle que soit la largeur : option inutile */}
                        {window.innerWidth >= 600 && (
                        <div className="settings-section">
                            <h3>Largeur des journées</h3>
                            <div className="language-options" role="radiogroup" aria-label="Largeur des journées">
                                {[['compact', 'Étroite'], ['medium', 'Moyenne'], ['large', 'Large']].map(([id, label]) => (
                                    <button
                                        key={id}
                                        role="radio"
                                        aria-checked={weeklyOptions.dayWidth === id}
                                        className={`language-btn${weeklyOptions.dayWidth === id ? ' active' : ''}`}
                                        onClick={() => weeklyOptions.set('weeklyDayWidth', id)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <p className="settings-option-desc" style={{ marginTop: '8px' }}>
                                Plus elles sont larges, moins il en tient côte à côte.
                            </p>
                        </div>
                        )}
                    </>
                )}

                {tab === 'columns' && view === 'day' && (
                    <>
                        {canUseExtendedView && (
                            <div className="settings-section">
                                <h3>Colonnes</h3>
                                <div className="language-options" role="radiogroup" aria-label="Colonnes">
                                    <button
                                        role="radio"
                                        aria-checked={!isExtendedView}
                                        className={`language-btn${!isExtendedView ? ' active' : ''}`}
                                        onClick={() => set('compact', true)}
                                    >
                                        <i className="fa-solid fa-list" style={{ marginRight: '6px' }}></i>Par couple de scènes
                                    </button>
                                    <button
                                        role="radio"
                                        aria-checked={isExtendedView}
                                        className={`language-btn${isExtendedView ? ' active' : ''}`}
                                        onClick={() => set('compact', false)}
                                    >
                                        <i className="fa-solid fa-table-columns" style={{ marginRight: '6px' }}></i>Par scène
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="settings-section">
                            <Toggle
                                icon="fa-solid fa-arrow-down-up-across-line"
                                title="Matin en haut"
                                desc="Les premiers concerts de la journée en haut de la colonne"
                                checked={state.reverse || false}
                                onChange={(v) => set('reverse', v)}
                            />
                            {dimPastToggle}


                            {/* Repères de scène : n'ont de sens qu'en vue par pôles */}
                            {!isExtendedView && (
                                <>
                                    <Toggle
                                        icon="fa-solid fa-grip-lines-vertical"
                                        title="Liseré de scène"
                                        desc="À gauche pour la 1re scène, à droite pour la 2e"
                                        checked={state.stageEdge !== false}
                                        onChange={(v) => set('stageEdge', v)}
                                    />
                                    <Toggle
                                        icon="fa-solid fa-arrows-left-right-to-line"
                                        title="Aligner les cartes sur leur scène"
                                        desc="À gauche pour la 1re scène, à droite pour la 2e"
                                        checked={!!state.stageSnap}
                                        onChange={(v) => set('stageSnap', v)}
                                    />
                                </>
                            )}
                        </div>
                    </>
                )}

                {tab === 'filters' && (
                    <div className="settings-section">
                        <div className="filter-section-header">
                            <h3>Scènes visibles</h3>
                            <button className="filter-toggle-all" onClick={() => filter.setAll(!allScenesOn)}>
                                {allScenesOn ? 'Tout désélectionner' : 'Tout sélectionner'}
                            </button>
                        </div>
                        {/* Carte : un bouton par couple, pas de filtre scène par scène */}
                        {filter.polesOnly && (
                            <div className="filter-scenes-grid" style={{ gridTemplateColumns: '1fr' }}>
                                {POLES.map(pole => {
                                    const [a, b] = pole.stages.map(stageItem);
                                    const onCount = pole.stages.filter(k => filter.isOn(k)).length;
                                    return (
                                        <label
                                            key={pole.id}
                                            className={`filter-scene-item ${onCount > 0 ? 'active' : ''}`}
                                            style={{
                                                background: onCount === 0
                                                    ? 'rgba(255, 255, 255, 0.05)'
                                                    : `linear-gradient(to right, ${a.color} 50%, ${b.color} 50%)`,
                                                opacity: onCount === 1 ? 0.6 : 1,
                                            }}
                                        >
                                            <input type="checkbox" checked={onCount === 2} onChange={() => togglePole(pole)} />
                                            <span className="filter-scene-name">{a.name} / {b.name}</span>
                                            <i className={`fa-solid ${onCount > 0 ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {/* Une ligne par couple : bouton du couple, puis ses 2 scènes */}
                        {!filter.polesOnly && (
                        <div className="filter-scenes-grid" style={{ gridTemplateColumns: '34px 1fr 1fr', alignItems: 'stretch' }}>
                            {POLES.map(pole => {
                                const [a, b] = pole.stages.map(stageItem);
                                const onCount = pole.stages.filter(k => filter.isOn(k)).length;
                                return (
                                    <React.Fragment key={pole.id}>
                                        <button
                                            onClick={() => togglePole(pole)}
                                            title={`${pole.name} : ${onCount === 2 ? 'masquer' : 'afficher'} le couple`}
                                            aria-label={`${pole.name} : ${onCount === 2 ? 'masquer' : 'afficher'} le couple`}
                                            style={{
                                                border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#fff',
                                                background: onCount === 0
                                                    ? 'rgba(255, 255, 255, 0.05)'
                                                    : `linear-gradient(to bottom, ${a.color} 50%, ${b.color} 50%)`,
                                                opacity: onCount === 1 ? 0.6 : 1,
                                            }}
                                        >
                                            <i className="fa-solid fa-link"></i>
                                        </button>
                                        {renderFilterItem(a)}
                                        {renderFilterItem(b)}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        )}
                        {(filter.extras || []).length > 0 && (
                            <div className="filter-scenes-grid" style={{ marginTop: '8px' }}>
                                {filter.extras.map(renderFilterItem)}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'icons' && mapOptions && (
                    <div className="settings-section">
                        <Toggle
                            icon="fa-solid fa-map-pin"
                            title="Points d'intérêt"
                            desc="Bars, restauration, services… (visibles à partir de 70 % de zoom)"
                            checked={state.mapShowPOI !== false}
                            onChange={(v) => set('mapShowPOI', v)}
                        />
                        <div className="settings-option">
                            <div className="settings-option-info">
                                <i className="fa-solid fa-magnifying-glass"></i>
                                <div>
                                    <span className="settings-option-title">Zoom</span>
                                    <span className="settings-option-desc">{Math.round(mapOptions.zoom * 100)} %</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="settings-reset-btn" onClick={mapOptions.zoomOut} disabled={!mapOptions.canZoomOut} aria-label="Zoom arrière">
                                    <i className="fa-solid fa-minus"></i>
                                </button>
                                <button className="settings-reset-btn" onClick={mapOptions.zoomIn} disabled={!mapOptions.canZoomIn} aria-label="Zoom avant">
                                    <i className="fa-solid fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'dev' && IS_DEV && (
                    <div className="settings-section">
                        <h3>Simuler la date et l'heure</h3>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <select
                                className="dev-sim-select"
                                value={sim?.date ?? ''}
                                onChange={(e) => setSim(e.target.value ? { date: e.target.value, minutes: simMinutes } : null)}
                                aria-label="Jour simulé"
                            >
                                <option value="">Heure réelle</option>
                                {SIM_DATE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            {sim && (
                                <>
                                    <select
                                        className="dev-sim-select"
                                        value={Math.floor(simMinutes / 60)}
                                        onChange={(e) => setSimTime(Number(e.target.value), simMinutes % 60)}
                                        aria-label="Heure simulée"
                                    >
                                        {Array.from({ length: 24 }, (_, h) => (
                                            <option key={h} value={h}>{String(h).padStart(2, '0')} h</option>
                                        ))}
                                    </select>
                                    <select
                                        className="dev-sim-select"
                                        value={simMinutes % 60}
                                        onChange={(e) => setSimTime(Math.floor(simMinutes / 60), Number(e.target.value))}
                                        aria-label="Minutes simulées"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                                            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                    <button className="settings-reset-btn" onClick={() => setSim(null)}>Heure réelle</button>
                                </>
                            )}
                        </div>
                        <p className="settings-option-desc" style={{ marginTop: '8px' }}>
                            Toutes les vues suivent cette heure (figée). Avant 6 h : nuit du jour précédent. Mémorisé, ignoré en production.
                        </p>
                    </div>
                )}
            </div>
        </FloatingCard>
    );
};

export default DisplayPanel;
