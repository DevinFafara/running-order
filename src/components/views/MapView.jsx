import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { STAGES, DAYS, MAP_POIS, INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS, CONTEXT_ORDER, STAGE_CONFIG } from '../../constants';
import bandLogos from '../../data/bandLogos.json';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useCurrentBands } from '../../hooks/useCurrentBands';
import { useGPS } from '../../hooks/useGPS';
import { gpsToMapPosition } from '../../utils/gpsToMap';
import StageMarker from '../map/StageMarker';
import '../../styles/MapView.css';

const ALL_STAGE_KEYS = Object.keys(STAGES);

function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const normalized = timeStr.replace('h', ':');
    const [h, m] = normalized.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    let minutes = h * 60 + m;
    if (h < 6) minutes += 24 * 60;
    return minutes;
}

function getCurrentFestivalMinutes(simMinutes) {
    if (simMinutes !== null) return simMinutes;
    const now = new Date();
    const h = now.getHours();
    return h * 60 + now.getMinutes() + (h < 6 ? 24 * 60 : 0);
}

function formatRemaining(mins) {
    if (mins <= 0) return '–';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

// Mercredi soir (avant Jeudi 01:00) : scènes secondaires + Off
const PRE_PAIRS = [
    ['HELLSTAGE', 'HELLCITY_STAGE'],
    ['METAL_CORNER', 'PURPLE_HOUSE'],
    ['LE_OFF1', 'LE_OFF2'],
];

// À partir de Jeudi 01:00 : toutes les scènes sauf les Off
const MAIN_PAIRS = [
    ['MAINSTAGE_1', 'MAINSTAGE_2'],
    ['WARZONE', 'VALLEY'],
    ['ALTAR', 'TEMPLE'],
    ['HELLSTAGE', 'HELLCITY_STAGE'],
    ['METAL_CORNER', 'PURPLE_HOUSE'],
];

const MIN_ZOOM = 0.30;
const MAX_ZOOM = 1.50;
const DEFAULT_ZOOM = 0.70;
const ZOOM_STEP = 0.25;
const ZOOM_WHEEL_STEP = 0.08;

// Mapping date locale → nom du jour festival (tel que stocké dans les données)
const FESTIVAL_DAY_MAP = {
    '2026-06-16': 'Mardi',
    '2026-06-17': 'Mercredi',
    '2026-06-18': 'Jeudi',
    '2026-06-19': 'Vendredi',
    '2026-06-20': 'Samedi',
    '2026-06-21': 'Dimanche',
};

// Options du sélecteur de simulation (inclut Lundi pour tester le post-minuit Dimanche)
const SIM_DATE_OPTIONS = [
    { value: '2026-06-16', label: 'Mar 16/06' },
    { value: '2026-06-17', label: 'Mer 17/06' },
    { value: '2026-06-18', label: 'Jeu 18/06' },
    { value: '2026-06-19', label: 'Ven 19/06' },
    { value: '2026-06-20', label: 'Sam 20/06' },
    { value: '2026-06-21', label: 'Dim 21/06' },
    { value: '2026-06-22', label: 'Lun 22/06' },
];

function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Retourne le nom du jour festival pour une date donnée (gère la convention post-minuit)
function getDayName(date) {
    const h = date.getHours();
    const adjusted = new Date(date);
    if (h < 6) adjusted.setDate(adjusted.getDate() - 1);
    return FESTIVAL_DAY_MAP[localDateKey(adjusted)] ?? null;
}

// Retourne 'thanks' (00h30–01h00 le Lundi) ou 'done' (après 01h00 le Lundi), sinon null
function getFestivalEndState(date) {
    if (date.getFullYear() !== 2026 || date.getMonth() !== 5 || date.getDate() !== 22) return null;
    const minutes = date.getHours() * 60 + date.getMinutes();
    if (minutes >= 60) return 'done';
    if (minutes >= 30) return 'thanks';
    return null;
}

function clampPan(px, py, zoom, containerW, containerH, imgW, imgH) {
    const scaledW = imgW * zoom;
    const scaledH = imgH * zoom;
    const overflowX = Math.max(0, scaledW - containerW);
    const overflowY = Math.max(0, scaledH - containerH);
    const margin = 40;
    return {
        x: Math.min(overflowX / 2 + margin, Math.max(-(overflowX / 2 + margin), px)),
        y: Math.min(overflowY / 2 + margin, Math.max(-(overflowY / 2 + margin), py)),
    };
}

const StageGridItem = ({ stageKey, stageData, isLeft, onSelect, simMinutes }) => {
    const { playing, next, status, config } = stageData;
    const { getBandTag, getInterestColor } = useCheckedState();
    if (!config) return null;

    const color = config.themeColor;
    const displayGroup = playing || next;
    const isPlaying = status === 'playing';
    const isNext = status === 'next';

    const currentMinutes = getCurrentFestivalMinutes(simMinutes ?? null);

    const handleClick = (e) => {
        e.stopPropagation();
        if (onSelect) onSelect(stageKey);
    };

    const getGroupTags = () => {
        if (!displayGroup) return null;
        const tag = getBandTag(displayGroup.id);
        if (!tag) return null;
        const interest = INTEREST_LEVELS[tag.interest];
        const context = CONTEXT_TAGS[tag.context];
        return {
            stars: interest ? interest.stars : 0,
            interestColor: tag.interest ? getInterestColor(tag.interest) : null,
            contextIcon: context ? context.icon : null,
        };
    };

    const tags = getGroupTags();
    const side = isLeft ? 'left' : 'right';

    return (
        <div
            className={`map-grid-item stage-marker--${status} stage-marker--${side}`}
            onClick={handleClick}
        >
            <div className="stage-marker__wrap">
                <div className="stage-marker__dot" style={{ backgroundColor: color }}>
                    {/* TODO(feature/map-view): re-enable pulse ring before closing feature */}
                    {/* {isPlaying && <div className="stage-marker__pulse" style={{ borderColor: color }} />} */}
                    <img src={config.icon} alt={config.name} className="stage-marker__icon" />
                    {tags && (
                        <div className="stage-marker__badges">
                            {tags.stars > 0 && (
                                <div className="stage-marker__badge stage-marker__badge--interest" style={{ color: tags.interestColor }}>★</div>
                            )}
                            {tags.contextIcon && (
                                <div className="stage-marker__badge stage-marker__badge--context">{tags.contextIcon}</div>
                            )}
                        </div>
                    )}
                </div>
                <div className={`stage-marker__chip stage-marker__chip--${status}`}>
                    {displayGroup ? (
                        <>
                            <div className="stage-marker__chip-header">
                                {isPlaying && <span className="stage-marker__chip-badge stage-marker__chip-badge--live">● LIVE</span>}
                                {isNext && <span className="stage-marker__chip-badge stage-marker__chip-badge--next">Prochain</span>}
                                <span className="stage-marker__chip-time">
                                    {isPlaying
                                        ? `- ${formatRemaining(timeToMinutes(displayGroup.FIN) - currentMinutes)}`
                                        : `dans ${formatRemaining(timeToMinutes(displayGroup.DEBUT) - currentMinutes)}`}
                                </span>
                            </div>
                            <span className="stage-marker__chip-band" style={{ color }}>{displayGroup.GROUPE}</span>
                        </>
                    ) : (
                        <span className="stage-marker__chip-idle">Inactif</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const FestivalEndMessage = ({ state }) => (
    <div className="map-festival-end">
        {state === 'thanks' ? (
            <span>🎆🎉 Merci d'avoir utilisé cette application — see you soon ! 🎉🎆</span>
        ) : (
            <span>L'édition Hellfest 2026 est terminée 🥲 — RDV en 2027 !</span>
        )}
    </div>
);

const StageGridPanel = ({ stageStatus, onStageSelect, isPrePhase, simMinutes }) => {
    if (!stageStatus || Object.keys(stageStatus).length === 0) return null;

    const pairs = isPrePhase ? PRE_PAIRS : MAIN_PAIRS;

    return (
        <div className="map-stage-grid">
            {pairs.map(([leftKey, rightKey]) => (
                <div key={`${leftKey}-${rightKey}`} className="map-stage-grid__row">
                    {stageStatus[leftKey] && (
                        <StageGridItem stageKey={leftKey} stageData={stageStatus[leftKey]} isLeft={true} onSelect={onStageSelect} simMinutes={simMinutes} />
                    )}
                    {stageStatus[rightKey] && (
                        <StageGridItem stageKey={rightKey} stageData={stageStatus[rightKey]} isLeft={false} onSelect={onStageSelect} simMinutes={simMinutes} />
                    )}
                </div>
            ))}
        </div>
    );
};

// ── BandDetailPanel ───────────────────────────────────────────────────────────

const BandDetailPanel = ({ group, stageColor, onClose }) => {
    const { state, setInterest, setContext, getBandTag, getInterestColor, updateNote } = useCheckedState();
    const [activeTab, setActiveTab] = useState('infos');
    const [note, setNote] = useState('');
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [dropdownPos, setDropdownPos] = useState(null);
    const tagBtnRef = useRef(null);
    const dropdownRef = useRef(null);

    const bandTag = getBandTag(group.id);
    const currentInterest = bandTag?.interest;
    const currentContext = bandTag?.context;

    useEffect(() => {
        setNote(state?.notes?.[group.id] || '');
    }, [group.id, state?.notes]);

    useEffect(() => {
        if (!showTagDropdown) return;
        const close = (e) => {
            if (dropdownRef.current?.contains(e.target)) return;
            if (tagBtnRef.current?.contains(e.target)) return;
            setShowTagDropdown(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [showTagDropdown]);

    const toggleDropdown = (e) => {
        e.stopPropagation();
        if (tagBtnRef.current) {
            const rect = tagBtnRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }
        setShowTagDropdown(p => !p);
    };

    const handleNoteChange = (e) => {
        const val = e.target.value;
        setNote(val);
        updateNote?.(group.id, val);
    };

    const getHeaderIcon = () => {
        if (currentInterest) return <span className="header-star" style={{ color: getInterestColor(currentInterest) }}>★</span>;
        if (currentContext) return <span className="header-context">{CONTEXT_TAGS[currentContext].icon}</span>;
        return <span className="header-star-empty">☆</span>;
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'infos':
                return (
                    <div className="tab-content fade-in">
                        {bandLogos[group.GROUPE] && (
                            <div className="group-logo-container" style={{ width: '100%', marginBottom: '10px', display: 'flex', justifyContent: 'center', backgroundColor: 'black' }}>
                                <img src={`${import.meta.env.BASE_URL}${bandLogos[group.GROUPE]}`} alt={group.GROUPE} style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }} />
                            </div>
                        )}
                        {group.STYLE && <div className="info-row"><i className="fa-solid fa-music" style={{ color: stageColor }} /><span>{group.STYLE}</span></div>}
                        {group.PAYS && <div className="info-row"><i className="fa-solid fa-globe" style={{ color: stageColor }} /><span>{group.PAYS}</span></div>}
                        {group.PARTICIPATIONS && <div className="info-row"><i className="fa-solid fa-fire" style={{ color: stageColor }} /><span>{group.PARTICIPATIONS}</span></div>}
                        {group.FFO && (
                            <div className="info-block">
                                <div className="info-label">Si vous aimez...</div>
                                <div className="info-value ffo">{group.FFO}</div>
                            </div>
                        )}
                    </div>
                );
            case 'bio':
                return (
                    <div className="tab-content fade-in scrollable">
                        <p className="bio-text">{group.Bio || 'Pas de biographie disponible.'}</p>
                    </div>
                );
            case 'links':
                return (
                    <div className="tab-content fade-in">
                        <div className="links-grid">
                            {group.QOBUZ && <a href={group.QOBUZ} target="_blank" rel="noopener noreferrer" className="link-btn qobuz"><img src={`${import.meta.env.BASE_URL}icons/qobuz_icon.png`} alt="Qobuz" className="qobuz-icon" />Qobuz</a>}
                            {group.SPOTIFY && <a href={group.SPOTIFY} target="_blank" rel="noopener noreferrer" className="link-btn spotify"><i className="fa-brands fa-spotify" /> Spotify</a>}
                            {group.DEEZER && <a href={group.DEEZER} target="_blank" rel="noopener noreferrer" className="link-btn deezer"><i className="fa-brands fa-deezer" /> Deezer</a>}
                            {group.YOUTUBE && <a href={group.YOUTUBE} target="_blank" rel="noopener noreferrer" className="link-btn youtube"><i className="fa-brands fa-youtube" /> YouTube</a>}
                            {group.BANDCAMP && <a href={group.BANDCAMP} target="_blank" rel="noopener noreferrer" className="link-btn bandcamp"><i className="fa-brands fa-bandcamp" /> Bandcamp</a>}
                            {group.SETLISTFM && <a href={group.SETLISTFM} target="_blank" rel="noopener noreferrer" className="link-btn setlistfm"><i className="fa-solid fa-list-ol" /> Setlist.fm</a>}
                            {group.FACEBOOK && <a href={group.FACEBOOK} target="_blank" rel="noopener noreferrer" className="link-btn facebook"><i className="fa-brands fa-facebook" /> Facebook</a>}
                            {group.INSTAGRAM && <a href={group.INSTAGRAM} target="_blank" rel="noopener noreferrer" className="link-btn instagram"><i className="fa-brands fa-instagram" /> Instagram</a>}
                            {group.SITE && <a href={group.SITE} target="_blank" rel="noopener noreferrer" className="link-btn website"><i className="fa-solid fa-globe" /> Site Web</a>}
                        </div>
                        {!group.QOBUZ && !group.SPOTIFY && !group.DEEZER && !group.YOUTUBE && !group.BANDCAMP && !group.SETLISTFM && !group.FACEBOOK && !group.INSTAGRAM && !group.SITE && (
                            <div className="no-data">Aucun lien disponible</div>
                        )}
                    </div>
                );
            case 'notes':
                return (
                    <div className="tab-content fade-in">
                        <textarea className="note-input" placeholder="Vos notes sur ce groupe..." value={note} onChange={handleNoteChange} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="map-band-detail">
            <div className="card-header" style={{ backgroundColor: stageColor }}>
                <div className="header-top">
                    <h3>{group.GROUPE}</h3>
                    <div className="header-actions">
                        <div className="tag-dropdown-container" style={{ position: 'relative' }}>
                            <button
                                ref={tagBtnRef}
                                className={`favorite-btn ${currentInterest || currentContext ? 'active' : ''}`}
                                onClick={toggleDropdown}
                                title="Marquer ce groupe"
                            >
                                {getHeaderIcon()}
                            </button>
                            {showTagDropdown && dropdownPos && createPortal(
                                <div ref={dropdownRef} className="tag-dropdown" style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, width: '190px', backgroundColor: '#222', border: '1px solid #444', borderRadius: '8px', padding: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 9999, textAlign: 'left' }}>
                                    <div className="dropdown-section-title" style={{ fontSize: '0.75em', padding: '2px 4px', marginBottom: '2px' }}>Intérêt</div>
                                    {INTEREST_ORDER.map(levelId => {
                                        const level = INTEREST_LEVELS[levelId];
                                        const isActive = currentInterest === levelId;
                                        return (
                                            <button key={levelId} className={`tag-dropdown-item ${isActive ? 'active' : ''}`} onClick={() => setInterest(group.id, isActive ? null : levelId)} style={{ '--tag-color': getInterestColor(levelId), display: 'flex', alignItems: 'center', width: '100%', padding: '3px 4px', marginBottom: '1px', background: isActive ? '#333' : 'transparent', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.85em' }}>
                                                <span className="interest-star-single" style={{ color: isActive ? getInterestColor(levelId) : '#555' }}>★</span>
                                                <span>{level.label}</span>
                                                {isActive && <span className="tag-check">✓</span>}
                                            </button>
                                        );
                                    })}
                                    <div className="dropdown-section-title" style={{ marginTop: '5px', marginBottom: '2px', fontSize: '0.75em', color: '#888', padding: '2px 4px' }}>Contexte</div>
                                    {CONTEXT_ORDER.map(contextId => {
                                        const ctx = CONTEXT_TAGS[contextId];
                                        const isActive = currentContext === contextId;
                                        return (
                                            <button key={contextId} className={`tag-dropdown-item ${isActive ? 'active' : ''}`} onClick={() => setContext(group.id, isActive ? null : contextId)} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '3px 4px', marginBottom: '1px', background: isActive ? '#333' : 'transparent', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '0.85em' }}>
                                                <span className="tag-item-icon">{ctx.icon}</span>
                                                <span>{ctx.label}</span>
                                                {isActive && <span className="tag-check">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>,
                                document.body
                            )}
                        </div>
                        <button className="close-btn" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
                    </div>
                </div>
            </div>
            <div className="card-tabs">
                <button className={`tab-btn ${activeTab === 'infos' ? 'active' : ''}`} onClick={() => setActiveTab('infos')}><i className="fa-solid fa-circle-info" /> Infos</button>
                <button className={`tab-btn ${activeTab === 'bio' ? 'active' : ''}`} onClick={() => setActiveTab('bio')}><i className="fa-solid fa-align-left" /> Bio</button>
                <button className={`tab-btn ${activeTab === 'links' ? 'active' : ''}`} onClick={() => setActiveTab('links')}><i className="fa-solid fa-link" /> Liens</button>
                <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}><i className="fa-solid fa-pen" /> Notes</button>
            </div>
            <div className="card-body">
                {renderContent()}
            </div>
        </div>
    );
};

// ── StageSchedulePanel ────────────────────────────────────────────────────────

const StageSchedulePanel = ({ stageKey, stageData, dayGroups, simMinutes, onClose }) => {
    const { config, status } = stageData || {};
    const [selectedBand, setSelectedBand] = useState(null);

    useEffect(() => { setSelectedBand(null); }, [stageKey]);

    if (!config) return null;

    const currentMins = getCurrentFestivalMinutes(simMinutes);
    const stageName = STAGES[stageKey];

    const remaining = dayGroups
        .filter(g => g.SCENE === stageName && timeToMinutes(g.FIN) > currentMins)
        .sort((a, b) => timeToMinutes(a.DEBUT) - timeToMinutes(b.DEBUT));

    return (
        <div className="map-schedule-panel" style={{ '--stage-color': config.themeColor }}>
            <div className={`map-scenes-slider${selectedBand ? ' map-scenes-slider--detail' : ''}`}>
                <div className="map-scenes-slider__page">
                    <div className="map-schedule-panel__header">
                        <img src={config.icon} alt={config.name} className="map-schedule-panel__icon" />
                        <span className="map-schedule-panel__name">{config.name}</span>
                        <button className="map-schedule-panel__close" onClick={onClose} aria-label="Fermer">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                    <div className="map-schedule-panel__list">
                        {remaining.length === 0 ? (
                            <div className="map-schedule-panel__empty">Aucun groupe à venir</div>
                        ) : (
                            remaining.map((group, idx) => {
                                const isFirst = idx === 0;
                                const isLive = isFirst && status === 'playing';
                                const isNextUp = isFirst && status === 'next';
                                return (
                                    <div
                                        key={group.id}
                                        className={`map-schedule-item${isLive ? ' map-schedule-item--live' : isNextUp ? ' map-schedule-item--next' : ''}`}
                                        onClick={() => setSelectedBand(group)}
                                    >
                                        <div className="map-schedule-item__time">
                                            {group.DEBUT?.replace('h', ':')}–{group.FIN?.replace('h', ':')}
                                        </div>
                                        <div className="map-schedule-item__band">
                                            {group.GROUPE}
                                        </div>
                                        {isLive && <span className="map-schedule-item__badge map-schedule-item__badge--live">● LIVE</span>}
                                        {isNextUp && <span className="map-schedule-item__badge map-schedule-item__badge--next">Prochain</span>}
                                        <i className="fa-solid fa-chevron-right map-schedule-item__chevron" />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                <div className="map-scenes-slider__page">
                    {selectedBand && (
                        <BandDetailPanel
                            group={selectedBand}
                            stageColor={config.themeColor}
                            onClose={() => setSelectedBand(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Helpers position (partagés avec GroupsPanel) ─────────────────────────────

const OFF_STAGE_KEYS = new Set([STAGES.LE_OFF1, STAGES.LE_OFF2]);

// Scale dérivé des GCPs : ~6.7m par 1% horizontal, ~6.5m par 1% vertical
const M_PER_PCT_X = 6.7;
const M_PER_PCT_Y = 6.5;
const MAX_NEAREST_M = 70;
const CAMPING_POI = MAP_POIS.find(p => p.id === 'poi-tents');
const MAX_CAMPING_M = 500;

// Retourne { name, distanceM } du POI/scène le plus proche, ou null si aucun candidat
function nearestLandmark(position) {
    if (!position) return null;
    const x = parseFloat(position.x);
    const y = parseFloat(position.y);
    // Position exactement au bord = clampée depuis hors-périmètre → pas de "Près de"
    if (x <= 0 || x >= 100 || y <= 0 || y >= 100) return null;
    let minDsq = Infinity, nearest = null, bestDx = 0, bestDy = 0;

    const check = (name, left, top) => {
        const dx = x - parseFloat(left);
        const dy = y - parseFloat(top);
        const d = dx * dx + dy * dy;
        if (d < minDsq) { minDsq = d; nearest = name; bestDx = dx; bestDy = dy; }
    };

    Object.entries(STAGE_CONFIG).forEach(([key, cfg]) => {
        if (OFF_STAGE_KEYS.has(key) || !cfg.mapPosition) return;
        check(cfg.name, cfg.mapPosition.left, cfg.mapPosition.top);
    });

    MAP_POIS.forEach(poi => {
        if (!poi.mapPosition) return;
        check(poi.name, poi.mapPosition.left, poi.mapPosition.top);
    });

    if (!nearest) return null;
    const distanceM = Math.sqrt((bestDx * M_PER_PCT_X) ** 2 + (bestDy * M_PER_PCT_Y) ** 2);
    return { name: nearest, distanceM };
}

function positionAge(updatedAt) {
    if (!updatedAt) return null;
    return Date.now() - new Date(updatedAt).getTime();
}

function formatAge(ms) {
    if (ms < 60000) return "à l'instant";
    if (ms < 3600000) return `il y a ${Math.floor(ms / 60000)} min`;
    return `il y a ${Math.floor(ms / 3600000)}h${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}`;
}

// ── GroupsTabContent ──────────────────────────────────────────────────────────

const GroupsTabContent = ({
    myGroups, activeGroupCode, setActiveGroupCode, activeGroupData,
    memberId, positionSource, setPositionSource, positionMode, setPositionMode, onFlyToMember,
    gpsAccuracy, gpsInBounds, gpsRawPosition, gpsError,
}) => {
    const selectedGroup = myGroups.find(g => g.code === activeGroupCode);
    const rawMembers = activeGroupData?.code === activeGroupCode ? activeGroupData.members : [];

    // Tri : moi en premier, puis online par proximité, puis offline
    const myPosition = rawMembers.find(m => m.member_id === memberId)?.position;
    const dist = (pos) => {
        if (!pos || !myPosition) return Infinity;
        const dx = parseFloat(pos.x) - parseFloat(myPosition.x);
        const dy = parseFloat(pos.y) - parseFloat(myPosition.y);
        return dx * dx + dy * dy;
    };
    const isOffline = (m) => {
        const age = positionAge(m.position_updated_at);
        return age === null || age > 7200000;
    };
    const members = [...rawMembers].sort((a, b) => {
        if (a.member_id === memberId) return -1;
        if (b.member_id === memberId) return 1;
        const aOff = isOffline(a), bOff = isOffline(b);
        if (aOff && !bOff) return 1;
        if (!aOff && bOff) return -1;
        return dist(a.position) - dist(b.position);
    });

    return (
        <div className="map-groups-tab">
            {/* Switch Manuel / GPS + bouton positionnement */}
            <div className="map-groups-switch">
                <button
                    className={`map-switch-btn${positionSource === 'manual' ? ' map-switch-btn--active' : ''}`}
                    onClick={() => setPositionSource('manual')}
                >
                    <i className="fa-solid fa-hand-pointer" style={{ marginRight: 5 }} />Manuel
                </button>
                <button
                    className={`map-switch-btn${positionSource === 'gps' ? ' map-switch-btn--active' : ''}`}
                    onClick={() => setPositionSource(s => s === 'gps' ? 'manual' : 'gps')}
                    title={gpsError ?? 'Localisation GPS automatique (toutes les 5 min)'}
                >
                    <i className="fa-solid fa-location-dot" style={{ marginRight: 5 }} />GPS
                    {positionSource === 'gps' && (
                        gpsAccuracy === null
                            ? <span className="map-switch-soon-badge"><i className="fa-solid fa-spinner fa-spin" /></span>
                            : gpsInBounds === false
                                ? <span className="map-switch-soon-badge" style={{ color: '#ff8a65' }}>Hors zone</span>
                                : <span className="map-switch-soon-badge">±{Math.round(gpsAccuracy)}m</span>
                    )}
                </button>
                {positionSource === 'manual' && (
                    <button
                        className={`map-switch-btn${positionMode ? ' map-switch-btn--active' : ''}`}
                        onClick={() => setPositionMode(p => !p)}
                        style={{ marginLeft: 'auto' }}
                    >
                        <i className="fa-solid fa-crosshairs" style={{ marginRight: 5 }} />
                        {positionMode ? 'Annuler' : 'Changer ma position'}
                    </button>
                )}
            </div>

            {/* Liste groupes ou membres */}
            <div className="map-groups-list">
                {selectedGroup ? (
                    <>
                        <button className="map-groups-back" onClick={() => setActiveGroupCode(null)}>
                            <i className="fa-solid fa-chevron-left" style={{ marginRight: 6 }} />{selectedGroup.name}
                        </button>
                        {members.length === 0 && (
                            <div className="map-groups-empty">
                                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Chargement…
                            </div>
                        )}
                        {members.map(m => {
                            const isMe = m.member_id === memberId;
                            const age = positionAge(m.position_updated_at);
                            const dotColor = age === null || age > 7200000 ? '#555' : age > 1800000 ? '#e6a817' : '#4caf50';
                            // Pour le user courant en mode GPS, utiliser la position brute
                            // (non clampée) afin de calculer une distance réelle
                            const posForDistance = (isMe && positionSource === 'gps' && gpsRawPosition)
                                ? gpsRawPosition
                                : m.position;
                            const landmark = nearestLandmark(posForDistance);
                            let nearText = null;
                            if (landmark && landmark.distanceM <= MAX_NEAREST_M) {
                                nearText = landmark.name;
                            } else if (posForDistance && CAMPING_POI) {
                                const cx2 = parseFloat(posForDistance.x);
                                const cy2 = parseFloat(posForDistance.y);
                                if (cx2 > 0 && cx2 < 100 && cy2 > 0 && cy2 < 100) {
                                    const dx = cx2 - parseFloat(CAMPING_POI.mapPosition.left);
                                    const dy = cy2 - parseFloat(CAMPING_POI.mapPosition.top);
                                    const dCamp = Math.sqrt((dx * M_PER_PCT_X) ** 2 + (dy * M_PER_PCT_Y) ** 2);
                                    if (dCamp <= MAX_CAMPING_M) nearText = CAMPING_POI.name;
                                }
                            }
                            const posText = age === null ? 'Position inconnue'
                                : age > 7200000 ? 'Hors ligne'
                                : nearText
                                    ? `Près de ${nearText} · ${formatAge(age)}`
                                    : formatAge(age);
                            return (
                                <div
                                    key={m.member_id}
                                    className={`map-member-row${m.position ? ' map-member-row--zoomable' : ''}`}
                                    onClick={() => m.position && onFlyToMember(m)}
                                >
                                    <span className="map-member-dot" style={{ backgroundColor: dotColor }} />
                                    <div className="map-member-info">
                                        <span className="map-member-name">
                                            {m.pseudo}{isMe && <span className="map-member-me"> (moi)</span>}
                                        </span>
                                        <span className="map-member-pos">{posText}</span>
                                    </div>
                                    {m.position && <i className="fa-solid fa-crosshairs map-member-zoom-icon" />}
                                </div>
                            );
                        })}
                    </>
                ) : (
                    myGroups.map(g => (
                        <div key={g.code} className="map-group-row" onClick={() => setActiveGroupCode(g.code)}>
                            <i className="fa-solid fa-user-group" style={{ color: '#dc2829', marginRight: 10, flexShrink: 0 }} />
                            <span className="map-group-name">{g.name}</span>
                            <i className="fa-solid fa-chevron-right" style={{ color: '#444', marginLeft: 'auto', flexShrink: 0 }} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const MemberMarker = ({ member, isMe, counterTransform }) => {
    if (!member.position) return null;
    const age = member.position_updated_at
        ? Date.now() - new Date(member.position_updated_at).getTime()
        : null;
    if (age !== null && age > 7200000) return null;

    const ringColor = age === null ? '#555' : age > 1800000 ? '#e6a817' : '#4caf50';
    const initials = member.pseudo.slice(0, 2).toUpperCase();

    return (
        <div className="member-marker" style={{ left: member.position.x, top: member.position.y }}>
            <div className="member-marker__inner" style={{ transform: `${counterTransform} translate(-15px, -15px)` }}>
                <div
                    className={`member-marker__dot${isMe ? ' member-marker__dot--me' : ''}`}
                    style={{
                        backgroundColor: isMe ? '#1565C0' : '#2a2a2a',
                        border: `2px solid ${isMe ? '#4fc3f7' : ringColor}`,
                        boxShadow: isMe ? '0 0 8px rgba(79,195,247,0.4)' : 'none',
                    }}
                >
                    {isMe ? <i className="fa-solid fa-location-dot" style={{ fontSize: '0.9rem' }} /> : initials}
                </div>
                <div className="member-marker__label">{member.pseudo}</div>
            </div>
        </div>
    );
};

const MapView = ({
    groups, onGroupSelect,
    myGroups = [], activeGroupCode = null, setActiveGroupCode = null,
    activeGroupData = null, memberId = null, updatePosition = null,
}) => {
    const [activePoiId, setActivePoiId] = useState(null);
    const [selectedStageKey, setSelectedStageKey] = useState(null);

    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('hf_map_tab') || 'scenes');
    const [positionSource, setPositionSource] = useState('manual');

    const switchTab = useCallback((tab) => {
        setActiveTab(tab);
        localStorage.setItem('hf_map_tab', tab);
        setSelectedStageKey(null);
    }, []);

    const handleStageMarkerClick = useCallback((stageKey) => {
        setActiveTab('scenes');
        localStorage.setItem('hf_map_tab', 'scenes');
        setSelectedStageKey(stageKey);
    }, []);

    // Auto-switch to groups tab when a group is activated from GroupsPanel
    useEffect(() => {
        if (activeGroupCode && myGroups.length > 0) switchTab('groups');
    }, [activeGroupCode]);

    // Auto-switch to scenes if user left all groups
    useEffect(() => {
        if (activeTab === 'groups' && myGroups.length === 0) switchTab('scenes');
    }, [myGroups.length]);

    const [positionMode, setPositionMode] = useState(false);

    const groupMembers = activeGroupData?.members || [];

    // Simulation — null = heure réelle
    const [simDate, setSimDate] = useState(null); // ex: '2026-06-21'
    const [simHour, setSimHour] = useState(15);

    // Timestamp simulé complet (identique à ce que new Date() retournerait pendant le festival)
    const effectiveDate = useMemo(() => {
        if (!simDate) return null;
        const [y, m, d] = simDate.split('-').map(Number);
        return new Date(y, m - 1, d, simHour, 0, 0);
    }, [simDate, simHour]);

    // Même logique pour simulation et temps réel
    const isFestivalLive = getDayName(new Date()) !== null;
    const isSimMode = effectiveDate !== null;
    const isPreviewActive = isSimMode || isFestivalLive;

    const activeDayName = useMemo(() => {
        if (isSimMode) return getDayName(effectiveDate);
        if (isFestivalLive) return getDayName(new Date());
        return null;
    }, [isSimMode, isFestivalLive, effectiveDate]);

    const dayGroups = useMemo(
        () => activeDayName ? groups.filter(g => g.DAY === activeDayName) : [],
        [groups, activeDayName]
    );

    // null = useCurrentBands utilise l'horloge réelle
    const simMinutes = useMemo(() => {
        if (!isSimMode) return null;
        const h = effectiveDate.getHours();
        return h * 60 + (h < 6 ? 24 * 60 : 0);
    }, [isSimMode, effectiveDate]);

    const stageStatus = useCurrentBands(dayGroups, simMinutes);

    const simTimeLabel = isSimMode
        ? `${String(simHour).padStart(2, '0')}h00`
        : null;

    // Mardi ou Mercredi du festival uniquement (pas avant le festival)
    const isMardMer = useMemo(() => {
        const ref = effectiveDate ?? new Date();
        const day = getDayName(ref);
        return day === 'Mardi' || day === 'Mercredi';
    }, [effectiveDate]);

    const festivalEndState = useMemo(() => {
        return getFestivalEndState(effectiveDate ?? new Date());
    }, [effectiveDate]);

    const [view, setView] = useState({ zoom: MIN_ZOOM, x: 0, y: 0 });
    const [initialCentered, setInitialCentered] = useState(false);

    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });
    const lastPinchDist = useRef(null);

    const containerRef = useRef(null);
    const innerRef = useRef(null);
    const imgRef = useRef(null);

    const mapSrc = `${import.meta.env.BASE_URL}hf-map.png`;

    const getContainerSize = () => {
        const el = containerRef.current;
        return el ? { w: el.clientWidth, h: el.clientHeight } : { w: window.innerWidth, h: window.innerHeight };
    };

    const getImgSize = () => {
        const el = imgRef.current;
        return el ? { w: el.naturalWidth || el.clientWidth, h: el.naturalHeight || el.clientHeight } : { w: 1376, h: 768 };
    };

    // Center map on left part once image is loaded
    useEffect(() => {
        if (initialCentered) return;
        const img = imgRef.current;
        if (!img) return;

        const doCenter = () => {
            const { w: cW, h: cH } = getContainerSize();
            const { w: iW, h: iH } = getImgSize();
            const zoom = DEFAULT_ZOOM;
            // Mardi/Mercredi (pré-phase) → Metal Corner ; sinon → centre du site
            let targetX, targetY;
            if (isMardMer) {
                const mc = STAGE_CONFIG[STAGES.METAL_CORNER]?.mapPosition;
                targetX = iW * (mc ? parseFloat(mc.left) / 100 : 0.847);
                targetY = iH * (mc ? parseFloat(mc.top)  / 100 : 0.791);
            } else {
                targetX = iW * 0.520;
                targetY = iH * 0.417;
            }
            // L'image est centrée dans le viewport par CSS (top/left 50% + translate -50%).
            // Pour centrer sur un point, on calcule l'offset de ce point par rapport au centre de l'image.
            const px = -(targetX - iW / 2) * zoom;
            const py = -(targetY - iH / 2) * zoom;
            setView({ zoom, x: px, y: py });
            setInitialCentered(true);
        };

        if (img.complete && img.naturalWidth > 0) {
            doCenter();
        } else {
            img.addEventListener('load', doCenter, { once: true });
            return () => img.removeEventListener('load', doCenter);
        }
    }, [initialCentered]);

    // Mesure la zone supérieure pour limiter la hauteur max du GroupCard
    useEffect(() => {
        const measure = () => {
            const header = document.querySelector('.map-view__header');
            const clock = document.querySelector('.map-view__clock-area');
            const appNav = 50;
            const h = appNav + (header?.offsetHeight ?? 0) + (clock?.offsetHeight ?? 0);
            document.documentElement.style.setProperty('--map-top-area', `${h}px`);
        };
        measure();
        const obs = new ResizeObserver(measure);
        ['.map-view__header', '.map-view__clock-area'].forEach(sel => {
            const el = document.querySelector(sel);
            if (el) obs.observe(el);
        });
        return () => { obs.disconnect(); document.documentElement.style.removeProperty('--map-top-area'); };
    }, []);

    // Mesure la hauteur de la grid pour ancrer le GroupCard à son bord supérieur
    useEffect(() => {
        let obs;
        const attach = () => {
            const grid = document.querySelector('.map-stage-grid');
            if (!grid) return;
            const update = () => document.documentElement.style.setProperty('--map-grid-height', `${grid.offsetHeight}px`);
            update();
            obs = new ResizeObserver(update);
            obs.observe(grid);
        };
        const t = setTimeout(attach, 0);
        return () => { clearTimeout(t); obs?.disconnect(); };
    }, [isMardMer, festivalEndState]);

    useEffect(() => () => document.documentElement.style.removeProperty('--map-grid-height'), []);

    // Synchronise les pulse rings : tous les markers partagent le même offset de phase
    useEffect(() => {
        const DURATION = 1500; // ms, doit correspondre à l'animation CSS
        const offset = -(Date.now() % DURATION) / 1000;
        document.documentElement.style.setProperty('--pulse-sync', `${offset.toFixed(3)}s`);
    }, []);

    // ── Zoom ──────────────────────────────────────────────────────────────────
    const changeZoom = useCallback((delta, focalX = null, focalY = null) => {
        setView(prev => {
            const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + delta));
            if (nextZoom === prev.zoom) return prev;

            let nx = prev.x;
            let ny = prev.y;

            if (focalX !== null && focalY !== null) {
                const { w: cW, h: cH } = getContainerSize();
                const focalOffsetX = focalX - cW / 2;
                const focalOffsetY = focalY - cH / 2;

                // Project current focal point to the image plane at zoom 1.0 (relative to image center)
                const mapPtX = (focalOffsetX - prev.x) / prev.zoom;
                const mapPtY = (focalOffsetY - prev.y) / prev.zoom;

                // Adjust pan so the same map point remains under the same focal point
                nx = focalOffsetX - mapPtX * nextZoom;
                ny = focalOffsetY - mapPtY * nextZoom;
            }

            const { w: iW, h: iH } = getImgSize();
            const { w: cW, h: cH } = getContainerSize();
            const clamped = clampPan(nx, ny, nextZoom, cW, cH, iW, iH);

            return { zoom: nextZoom, x: clamped.x, y: clamped.y };
        });
    }, []);



    const flyToMember = useCallback((member) => {
        if (!member.position) return;
        const { w: iW, h: iH } = getImgSize();
        const targetX = parseFloat(member.position.x) / 100 * iW;
        const targetY = parseFloat(member.position.y) / 100 * iH;
        setView({ zoom: MAX_ZOOM, x: -(targetX - iW / 2) * MAX_ZOOM, y: -(targetY - iH / 2) * MAX_ZOOM });
    }, []);

    // ── Mouse wheel zoom ──────────────────────────────────────────────────────
    const onWheel = useCallback((e) => {
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        const delta = e.deltaY < 0 ? ZOOM_WHEEL_STEP : -ZOOM_WHEEL_STEP;
        changeZoom(delta, e.clientX - rect.left, e.clientY - rect.top);
    }, [changeZoom]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [onWheel]);

    // ── Mouse pan ─────────────────────────────────────────────────────────────
    const onMouseDown = useCallback((e) => {
        if (positionMode || e.button !== 0) return;
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { x: view.x, y: view.y };
        e.preventDefault();
    }, [positionMode, view.x, view.y]);

    const onMouseMove = useCallback((e) => {
        if (!isDragging.current) return;
        const raw = { x: panStart.current.x + e.clientX - dragStart.current.x, y: panStart.current.y + e.clientY - dragStart.current.y };
        const { w: iW, h: iH } = getImgSize();
        const { w: cW, h: cH } = getContainerSize();
        const clamped = clampPan(raw.x, raw.y, view.zoom, cW, cH, iW, iH);
        setView(prev => ({ ...prev, x: clamped.x, y: clamped.y }));
    }, [view.zoom]);

    const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

    useEffect(() => {
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('mousemove', onMouseMove);
        return () => { window.removeEventListener('mouseup', onMouseUp); window.removeEventListener('mousemove', onMouseMove); };
    }, [onMouseUp, onMouseMove]);

    // ── Touch pan + pinch zoom + twist ────────────────────────────────────────
    const onTouchStart = useCallback((e) => {
        if (positionMode) return;
        if (e.touches.length === 1) {
            isDragging.current = true;
            dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            panStart.current = { x: view.x, y: view.y };
        } else if (e.touches.length === 2) {
            isDragging.current = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDist.current = Math.hypot(dx, dy);
        }
    }, [view.x, view.y]);

    const onTouchMove = useCallback((e) => {
        if (e.touches.length === 1 && isDragging.current) {
            const raw = { x: panStart.current.x + e.touches[0].clientX - dragStart.current.x, y: panStart.current.y + e.touches[0].clientY - dragStart.current.y };
            const { w: iW, h: iH } = getImgSize();
            const { w: cW, h: cH } = getContainerSize();
            const clamped = clampPan(raw.x, raw.y, view.zoom, cW, cH, iW, iH);
            setView(prev => ({ ...prev, x: clamped.x, y: clamped.y }));
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (lastPinchDist.current !== null) {
                const rect = containerRef.current.getBoundingClientRect();
                changeZoom((dist - lastPinchDist.current) / 400,
                    (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
                    (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top);
            }
            lastPinchDist.current = dist;
        }
    }, [view.zoom, changeZoom]);

    const onTouchEnd = useCallback(() => { isDragging.current = false; lastPinchDist.current = null; }, []);

    // ── Edit mode click ───────────────────────────────────────────────────────
    const handleMapClick = useCallback((e) => {
        const inner = innerRef.current;
        if (!inner) return;
        const rect = inner.getBoundingClientRect();
        const x = Math.max(0.1, Math.min(99.9, (e.clientX - rect.left) / rect.width * 100)).toFixed(1);
        const y = Math.max(0.1, Math.min(99.9, (e.clientY - rect.top) / rect.height * 100)).toFixed(1);

        if (positionMode && updatePosition) {
            updatePosition({ x: `${x}%`, y: `${y}%` });
            setPositionMode(false);
            return;
        }

        if (activePoiId) setActivePoiId(null);
    }, [positionMode, updatePosition, activePoiId]);

    const counterTransform = `scale(${1 / view.zoom})`;

    const handleGPSPosition = useCallback((mapPos) => {
        if (updatePosition) updatePosition(mapPos);
    }, [updatePosition]);

    const { accuracy: gpsAccuracy, inBounds: gpsInBounds, rawPosition: gpsRawPosition, error: gpsError } = useGPS({
        active: positionSource === 'gps',
        onPosition: handleGPSPosition,
        onPermissionDenied: useCallback(() => setPositionSource('manual'), []),
    });

    // Disable tap-to-position mode when GPS takes over
    useEffect(() => {
        if (positionSource === 'gps') setPositionMode(false);
    }, [positionSource]);

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        window.__testGPS = (lat, lng) => {
            const pos = gpsToMapPosition(lat, lng);
            handleGPSPosition(pos);
            console.log('[GPS test]', { lat, lng, mapPos: pos });
        };
        return () => { delete window.__testGPS; };
    }, [handleGPSPosition]);


    return (
        <div className="map-view">
            {/* Header */}
            <div className="map-view__header">
                <div className="map-zoom-btns">
                    <button className="map-zoom-btn" onClick={() => changeZoom(-ZOOM_STEP)} disabled={view.zoom <= MIN_ZOOM} title="Zoom arrière"><i className="fa-solid fa-minus" /></button>
                    <span className="map-zoom-level">{Math.round(view.zoom * 100)}%</span>
                    <button className="map-zoom-btn" onClick={() => changeZoom(ZOOM_STEP)} disabled={view.zoom >= MAX_ZOOM} title="Zoom avant"><i className="fa-solid fa-plus" /></button>
                </div>
            </div>

            {positionMode && (
                <div className="map-position-banner">
                    <i className="fa-solid fa-hand-pointer" style={{ marginRight: 6 }} />Tap sur la carte pour te localiser
                    <button
                        onClick={() => { updatePosition(null); setPositionMode(false); }}
                        style={{ background: 'none', border: 'none', color: '#ef9a9a', cursor: 'pointer', fontSize: '0.8rem', padding: 0, marginLeft: 'auto' }}
                    >Retirer ma position</button>
                    <button
                        onClick={() => setPositionMode(false)}
                        style={{ background: 'none', border: 'none', color: '#90caf9', cursor: 'pointer', fontSize: '0.8rem', padding: 0, marginLeft: 8 }}
                    >Annuler</button>
                </div>
            )}

            <div className="map-view__clock-area">
                <select
                    className={`map-sim-select ${isSimMode ? 'map-sim-select--active' : ''}`}
                    value={simDate ?? ''}
                    onChange={e => setSimDate(e.target.value || null)}
                >
                    <option value="">Heure réelle</option>
                    {SIM_DATE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {isSimMode && (
                    <select
                        className="map-sim-select map-sim-select--active"
                        value={simHour}
                        onChange={e => setSimHour(Number(e.target.value))}
                    >
                        {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, '0')}h00</option>
                        ))}
                    </select>
                )}
                <LiveClock isPreviewActive={isPreviewActive} isFestivalLive={isFestivalLive} simDay={isSimMode ? activeDayName : null} simTimeLabel={simTimeLabel} />
            </div>

            {/* Map viewport */}
            <div
                className={`map-view__container ${positionMode ? 'map-view__container--position' : 'map-view__container--pan'}`}
                ref={containerRef}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={handleMapClick}
            >
                <div
                    className="map-view__inner"
                    ref={innerRef}
                    style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
                >
                    <img ref={imgRef} src={mapSrc} alt="Plan du site Hellfest" className="map-view__bg" draggable={false} />

                    {ALL_STAGE_KEYS.map((stageKey) => {
                        const data = stageStatus[stageKey];
                        if (!data) return null;
                        return (
                            <StageMarker
                                key={stageKey}
                                stageKey={stageKey}
                                stageData={data}
                                onSelect={handleStageMarkerClick}
                                counterTransform={counterTransform}
                            />
                        );
                    })}

                    {/* Member markers */}
                    {groupMembers.map(m => (
                        <MemberMarker
                            key={m.member_id}
                            member={m}
                            isMe={m.member_id === memberId}
                            counterTransform={counterTransform}
                        />
                    ))}

                    {/* POI Markers — visibles à partir de 70% de zoom (compris) */}
                    {view.zoom >= DEFAULT_ZOOM && MAP_POIS.map((poi) => (
                        <POIMarker
                            key={poi.id}
                            poi={poi}
                            activePoiId={activePoiId}
                            setActivePoiId={setActivePoiId}
                            counterTransform={counterTransform}
                        />
                    ))}


                </div>
            </div>

            {/* Zone tabulée bas */}
            <div className="map-bottom-zone">
                <div className="map-bottom-zone__tabs">
                    <button
                        className={`map-tab-btn${activeTab === 'scenes' ? ' map-tab-btn--active' : ''}`}
                        onClick={() => switchTab('scenes')}
                    >
                        Scènes
                    </button>
                    {myGroups.length > 0 && (
                        <button
                            className={`map-tab-btn${activeTab === 'groups' ? ' map-tab-btn--active' : ''}`}
                            onClick={() => switchTab('groups')}
                        >
                            Mes groupes
                        </button>
                    )}
                </div>
                <div className="map-bottom-zone__content">
                    {activeTab === 'scenes' ? (
                        festivalEndState
                            ? <FestivalEndMessage state={festivalEndState} />
                            : <div className="map-scenes-content">
                                <div className={`map-scenes-slider${selectedStageKey ? ' map-scenes-slider--detail' : ''}`}>
                                    <div className="map-scenes-slider__page">
                                        {isMardMer && (
                                            <div className="map-prephase-msg">
                                                Ouverture des portes Jeudi à 14h
                                            </div>
                                        )}
                                        <StageGridPanel stageStatus={stageStatus} onStageSelect={setSelectedStageKey} isPrePhase={isMardMer} simMinutes={simMinutes} />
                                    </div>
                                    <div className="map-scenes-slider__page">
                                        {selectedStageKey && stageStatus[selectedStageKey] && (
                                            <StageSchedulePanel
                                                stageKey={selectedStageKey}
                                                stageData={stageStatus[selectedStageKey]}
                                                dayGroups={dayGroups}
                                                simMinutes={simMinutes}
                                                onClose={() => setSelectedStageKey(null)}
                                            />
                                        )}
                                    </div>
                                </div>
                              </div>
                    ) : (
                        <GroupsTabContent
                            myGroups={myGroups}
                            activeGroupCode={activeGroupCode}
                            setActiveGroupCode={setActiveGroupCode}
                            activeGroupData={activeGroupData}
                            memberId={memberId}
                            positionSource={positionSource}
                            setPositionSource={setPositionSource}
                            positionMode={positionMode}
                            setPositionMode={setPositionMode}
                            onFlyToMember={flyToMember}
                            gpsAccuracy={gpsAccuracy}
                            gpsInBounds={gpsInBounds}
                            gpsRawPosition={gpsRawPosition}
                            gpsError={gpsError}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const LiveClock = ({ isPreviewActive, isFestivalLive, simDay, simTimeLabel }) => {
    const [time, setTime] = React.useState(new Date());
    React.useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;

    // During preview (not live festival), show simulated day + time
    const isSimDisplay = isPreviewActive && !isFestivalLive;
    const label = isSimDisplay && simDay
        ? `⏱ ${simDay} ${simTimeLabel || ''}`
        : timeStr;

    return (
        <div className={`map-view__clock ${isSimDisplay ? 'map-view__clock--sim' : ''}`}>
            <i className="fa-solid fa-clock" /> {label}
        </div>
    );
};

const POIMarker = ({ poi, counterTransform, activePoiId, setActivePoiId }) => {
    const showLabel = activePoiId === poi.id;

    return (
        <div
            className={`poi-marker ${showLabel ? 'poi-marker--active' : ''}`}
            style={{ left: poi.mapPosition.left, top: poi.mapPosition.top }}
            onClick={(e) => {
                e.stopPropagation();
                setActivePoiId(showLabel ? null : poi.id);
            }}
        >
            <div className="poi-marker__inner" style={{ transform: counterTransform }}>
                <div
                    className="poi-marker__dot"
                    style={{ backgroundColor: poi.color || '#333', cursor: 'pointer', pointerEvents: 'auto' }}
                >
                    <i className={`${poi.icon} poi-marker__icon`} title={poi.name}></i>
                </div>

                {showLabel && (
                    <div className="poi-marker__label">
                        {poi.name}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapView;
