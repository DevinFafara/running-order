import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { STAGES, DAYS } from '../../constants';
import { useCurrentBands } from '../../hooks/useCurrentBands';
import StageMarker from '../map/StageMarker';
import '../../styles/MapView.css';

const ALL_STAGE_KEYS = Object.keys(STAGES);

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.0;
const ZOOM_STEP = 0.25;
const ZOOM_WHEEL_STEP = 0.08;
const ROTATION_STEP = 15;

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

    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1.0);
    const [rotation, setRotation] = useState(0);

    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });
    const lastPinchDist = useRef(null);
    const lastPinchAngle = useRef(null);

    const containerRef = useRef(null);
    const innerRef = useRef(null);
    const imgRef = useRef(null);

    const mapSrc = `${import.meta.env.BASE_URL}hf_map.png`;

    const getContainerSize = () => {
        const el = containerRef.current;
        return el ? { w: el.clientWidth, h: el.clientHeight } : { w: window.innerWidth, h: window.innerHeight };
    };

    const getImgSize = () => {
        const el = imgRef.current;
        return el ? { w: el.naturalWidth || el.clientWidth, h: el.naturalHeight || el.clientHeight } : { w: 1024, h: 659 };
    };

    // ── Zoom ──────────────────────────────────────────────────────────────────
    const changeZoom = useCallback((delta, focalX = null, focalY = null) => {
        setZoom(prev => {
            const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta));
            if (next === prev) return prev;
            setPan(prevPan => {
                let nx = prevPan.x;
                let ny = prevPan.y;
                if (focalX !== null && focalY !== null) {
                    const { w: cW, h: cH } = getContainerSize();
                    const focalOffsetX = focalX - cW / 2;
                    const focalOffsetY = focalY - cH / 2;
                    const mapPtX = (focalOffsetX - prevPan.x) / prev;
                    const mapPtY = (focalOffsetY - prevPan.y) / prev;
                    nx = focalOffsetX - mapPtX * next;
                    ny = focalOffsetY - mapPtY * next;
                }
                const { w: iW, h: iH } = getImgSize();
                const { w: cW, h: cH } = getContainerSize();
                return clampPan(nx, ny, next, cW, cH, iW, iH);
            });
            return next;
        });
    }, []);

    const changeRotation = useCallback((delta) => {
        setRotation(prev => (prev + delta + 360) % 360);
    }, []);

    // ── Mouse wheel zoom ──────────────────────────────────────────────────────
    const onWheel = useCallback((e) => {
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        changeZoom(e.deltaY < 0 ? ZOOM_WHEEL_STEP : -ZOOM_WHEEL_STEP, e.clientX - rect.left, e.clientY - rect.top);
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
        panStart.current = { ...pan };
        e.preventDefault();
    }, [editMode, pan]);

    const onMouseMove = useCallback((e) => {
        if (!isDragging.current) return;
        const raw = { x: panStart.current.x + e.clientX - dragStart.current.x, y: panStart.current.y + e.clientY - dragStart.current.y };
        const { w: iW, h: iH } = getImgSize();
        const { w: cW, h: cH } = getContainerSize();
        setPan(clampPan(raw.x, raw.y, zoom, cW, cH, iW, iH));
    }, [zoom]);

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
            panStart.current = { ...pan };
        } else if (e.touches.length === 2) {
            isDragging.current = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDist.current = Math.hypot(dx, dy);
            lastPinchAngle.current = Math.atan2(dy, dx) * (180 / Math.PI);
        }
    }, [editMode, pan]);

    const onTouchMove = useCallback((e) => {
        if (e.touches.length === 1 && isDragging.current) {
            const raw = { x: panStart.current.x + e.touches[0].clientX - dragStart.current.x, y: panStart.current.y + e.touches[0].clientY - dragStart.current.y };
            const { w: iW, h: iH } = getImgSize();
            const { w: cW, h: cH } = getContainerSize();
            setPan(clampPan(raw.x, raw.y, zoom, cW, cH, iW, iH));
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (lastPinchDist.current !== null) {
                const rect = containerRef.current.getBoundingClientRect();
                changeZoom((dist - lastPinchDist.current) / 400,
                    (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
                    (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top);
            }
            if (lastPinchAngle.current !== null) setRotation(prev => (prev + angle - lastPinchAngle.current + 360) % 360);
            lastPinchDist.current = dist;
            lastPinchAngle.current = angle;
        }
    }, [zoom, changeZoom]);

    const onTouchEnd = useCallback(() => { isDragging.current = false; lastPinchDist.current = null; lastPinchAngle.current = null; }, []);

    // ── Edit mode click ───────────────────────────────────────────────────────
    const handleMapClick = useCallback((e) => {
        if (!editMode) return;
        const inner = innerRef.current;
        if (!inner) return;
        const rect = inner.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
        setCopiedCoords({ left: `${x}%`, top: `${y}%` });
        navigator.clipboard.writeText(`mapPosition: { left: '${x}%', top: '${y}%' }`).catch(() => { });
    }, [editMode]);

    const counterTransform = `scale(${1 / zoom}) rotate(${-rotation}deg)`;
    const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); setRotation(0); }, []);


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
                        <button className="map-zoom-btn" onClick={() => changeZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} title="Zoom arrière"><i className="fa-solid fa-minus" /></button>
                        <span className="map-zoom-level">{Math.round(zoom * 100)}%</span>
                        <button className="map-zoom-btn" onClick={() => changeZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} title="Zoom avant"><i className="fa-solid fa-plus" /></button>
                    </div>

                    {/* Rotation */}
                    <div className="map-zoom-btns">
                        <button className="map-zoom-btn" onClick={() => changeRotation(-ROTATION_STEP)} title="Rotation anti-horaire"><i className="fa-solid fa-rotate-left" /></button>
                        <span className="map-zoom-level">{Math.round(rotation)}°</span>
                        <button className="map-zoom-btn" onClick={() => changeRotation(ROTATION_STEP)} title="Rotation horaire"><i className="fa-solid fa-rotate-right" /></button>
                    </div>

                    {/* Reset */}
                    <button className="map-zoom-btn map-zoom-btn--reset map-zoom-btn--standalone" onClick={resetView} title="Réinitialiser vue"><i className="fa-solid fa-arrows-to-dot" /></button>



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
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)` }}
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

export default MapView;
