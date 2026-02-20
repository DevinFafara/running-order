import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { STAGES, DAYS, MAP_POIS } from '../../constants';
import { useCurrentBands } from '../../hooks/useCurrentBands';
import StageMarker from '../map/StageMarker';
import '../../styles/MapView.css';

const ALL_STAGE_KEYS = Object.keys(STAGES);

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.0;
const ZOOM_STEP = 0.25;
const ZOOM_WHEEL_STEP = 0.08;

// Hellfest 2026 dates: Mercredi 17 → Dimanche 21 juin 2026
const FESTIVAL_DATES = [
    new Date(2026, 5, 17), // Mercredi (month is 0-indexed)
    new Date(2026, 5, 18), // Jeudi
    new Date(2026, 5, 19), // Vendredi
    new Date(2026, 5, 20), // Samedi
    new Date(2026, 5, 21), // Dimanche
];

/**
 * Returns the festival day index (0–4) if we are currently during the Hellfest,
 * or null if we are outside the festival period.
 * Handles post-midnight: before 6am counts as the previous day's festival day.
 */
function getAutoFestivalDayIndex() {
    const now = new Date();
    const h = now.getHours();
    // If before 6am, consider it still the previous calendar day
    const adjustedDate = new Date(now);
    if (h < 6) adjustedDate.setDate(adjustedDate.getDate() - 1);

    const dateStr = adjustedDate.toDateString();
    const idx = FESTIVAL_DATES.findIndex(d => d.toDateString() === dateStr);
    return idx >= 0 ? idx : null;
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

const MapView = ({ groups, onGroupSelect }) => {
    const [editMode, setEditMode] = useState(false);
    const [copiedCoords, setCopiedCoords] = useState(null);
    const [activePoiId, setActivePoiId] = useState(null);

    // Day simulation — null means "neutral" (no festival day active)
    // Auto-detects if we're actually during the Hellfest
    const [simDayIndex, setSimDayIndex] = useState(() => getAutoFestivalDayIndex());
    const isPreviewActive = simDayIndex !== null;
    const isFestivalLive = getAutoFestivalDayIndex() !== null;

    // Filter groups by selected day, or empty array if no day selected
    const dayGroups = useMemo(
        () => simDayIndex !== null ? groups.filter(g => g.DAY === DAYS[simDayIndex]) : [],
        [groups, simDayIndex]
    );

    // When in preview mode (not during live festival), don't use real time
    // During live festival, use real time (simMinutes = null lets useCurrentBands use real clock)
    const simMinutes = isPreviewActive && !isFestivalLive ? 15 * 60 : null; // default to 15h for preview
    const stageStatus = useCurrentBands(dayGroups, isPreviewActive && !isFestivalLive ? simMinutes : null);

    // Format simulated time for display
    const simTimeLabel = simMinutes !== null
        ? `${String(Math.floor((simMinutes % (24 * 60)) / 60 + (simMinutes >= 24 * 60 ? 0 : 0))).padStart(2, '0')}h${String(simMinutes % 60).padStart(2, '0')}`
        : null;

    const [view, setView] = useState({ zoom: 1.0, x: 0, y: 0 });

    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });
    const lastPinchDist = useRef(null);

    const containerRef = useRef(null);
    const innerRef = useRef(null);
    const imgRef = useRef(null);

    const mapSrc = `${import.meta.env.BASE_URL}hf-map.svg`;

    const getContainerSize = () => {
        const el = containerRef.current;
        return el ? { w: el.clientWidth, h: el.clientHeight } : { w: window.innerWidth, h: window.innerHeight };
    };

    const getImgSize = () => {
        const el = imgRef.current;
        return el ? { w: el.naturalWidth || el.clientWidth, h: el.naturalHeight || el.clientHeight } : { w: 4597, h: 2654 };
    };

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
        if (editMode || e.button !== 0) return;
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { x: view.x, y: view.y };
        e.preventDefault();
    }, [editMode, view.x, view.y]);

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
        if (editMode) return;
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
    }, [editMode, view.x, view.y]);

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
        if (activePoiId) setActivePoiId(null);
        if (!editMode) return;
        const inner = innerRef.current;
        if (!inner) return;
        const rect = inner.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
        setCopiedCoords({ left: `${x}%`, top: `${y}%` });
        navigator.clipboard.writeText(`mapPosition: { left: '${x}%', top: '${y}%' }`).catch(() => { });
    }, [editMode]);

    const counterTransform = `scale(${1 / view.zoom})`;
    // Suppression du bouton de réinitialisation via resetView non utilisé dans le header désormais


    return (
        <div className="map-view">
            {/* Header */}
            <div className="map-view__header">
                <div className="map-view__legend">
                    <span className="map-legend-item"><span className="map-legend-dot map-legend-dot--playing" /> En cours</span>
                    <span className="map-legend-item"><span className="map-legend-dot map-legend-dot--next" /> Prochain</span>
                    <span className="map-legend-item"><span className="map-legend-dot map-legend-dot--idle" /> Inactif</span>
                </div>

                <div className="map-view__controls">
                    {/* Zoom */}
                    <div className="map-zoom-btns">
                        <button className="map-zoom-btn" onClick={() => changeZoom(-ZOOM_STEP)} disabled={view.zoom <= MIN_ZOOM} title="Zoom arrière"><i className="fa-solid fa-minus" /></button>
                        <span className="map-zoom-level">{Math.round(view.zoom * 100)}%</span>
                        <button className="map-zoom-btn" onClick={() => changeZoom(ZOOM_STEP)} disabled={view.zoom >= MAX_ZOOM} title="Zoom avant"><i className="fa-solid fa-plus" /></button>
                    </div>



                    {/* Edit mode */}
                    <button
                        className={`map-edit-btn ${editMode ? 'map-edit-btn--active' : ''}`}
                        onClick={() => { setEditMode(v => !v); setCopiedCoords(null); }}
                    >
                        <i className={`fa-solid ${editMode ? 'fa-xmark' : 'fa-crosshairs'}`} />
                        <span>{editMode ? 'Quitter' : 'Éditer'}</span>
                    </button>
                </div>
            </div>

            {/* Edit mode banner */}
            {editMode && (
                <div className="map-edit-banner">
                    <i className="fa-solid fa-circle-info" />
                    &nbsp;Cliquez sur la carte pour copier les coordonnées.
                    {copiedCoords && (
                        <span className="map-edit-coords">
                            &nbsp;→ <code>left: {copiedCoords.left}, top: {copiedCoords.top}</code>
                            <span className="map-edit-copied">✓ Copié !</span>
                        </span>
                    )}
                </div>
            )}

            {/* Map viewport */}
            <div
                className={`map-view__container ${editMode ? 'map-view__container--edit' : 'map-view__container--pan'}`}
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
                                onSelect={editMode ? undefined : onGroupSelect}
                                counterTransform={counterTransform}
                            />
                        );
                    })}

                    {/* POI Markers */}
                    {MAP_POIS.map((poi) => (
                        <POIMarker
                            key={poi.id}
                            poi={poi}
                            activePoiId={activePoiId}
                            setActivePoiId={setActivePoiId}
                            counterTransform={counterTransform}
                        />
                    ))}

                    {editMode && copiedCoords && (
                        <div className="map-edit-crosshair" style={{ left: copiedCoords.left, top: copiedCoords.top }} />
                    )}
                </div>
            </div>

            <div className="map-view__clock-area">
                <button
                    className={`map-preview-btn ${isPreviewActive && !isFestivalLive ? 'map-preview-btn--active' : ''}`}
                    onClick={() => {
                        if (!isPreviewActive) {
                            // Start preview at first day (Mercredi)
                            setSimDayIndex(0);
                        } else if (simDayIndex < DAYS.length - 1) {
                            // Cycle to next day
                            setSimDayIndex(simDayIndex + 1);
                        } else {
                            // After last day, turn off preview
                            setSimDayIndex(isFestivalLive ? getAutoFestivalDayIndex() : null);
                        }
                    }}
                    title={isPreviewActive ? `Aperçu: ${DAYS[simDayIndex]} ${simTimeLabel || ''} (clic = jour suivant)` : 'Aperçu programme'}
                >
                    <i className={`fa-solid ${isPreviewActive && !isFestivalLive ? 'fa-eye' : 'fa-calendar-day'}`} />
                    {isPreviewActive && !isFestivalLive ? `${DAYS[simDayIndex]} ${simTimeLabel}` : 'Aperçu'}
                </button>
                <LiveClock isPreviewActive={isPreviewActive} isFestivalLive={isFestivalLive} simDay={simDayIndex !== null ? DAYS[simDayIndex] : null} simTimeLabel={simTimeLabel} />
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
