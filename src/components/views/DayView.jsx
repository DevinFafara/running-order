import chroma from 'chroma-js';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useCheckedState } from '../../context/CheckedStateContext';
import { STAGE_CONFIG, POLES, MAIN_STAGES } from '../../constants';
import { EDITION, poleTexture, poleBackground, poleColor, textureIntensityOf } from '../../editions';
import { bandRange, rangesOverlap, toFestivalMinutes, formatMinutes } from '../../utils/time';
import { useFestivalNow } from '../../context/FestivalClockContext';
import Band from '../common/Band';
import StageIcon from '../common/StageIcon';
import TagMenu from '../common/TagMenu';

const DV = EDITION.dayView;

const SceneHeader = ({ config, sceneName }) => {
    const [imgFailed, setImgFailed] = useState(false);
    return (
        <>
            {!imgFailed && (
                <StageIcon
                    stageKey={sceneName}
                    className="scene-image"
                    src={config?.icon}
                    alt={config?.name || sceneName}
                    onError={() => setImgFailed(true)}
                />
            )}
            <h3>{config?.name}</h3>
        </>
    );
};

const overlapsWithAny = (group, otherGroups) => {
    const r = bandRange(group);
    return otherGroups.some(other => rangesOverlap(r, bandRange(other)));
};

const HourTag = ({ hour }) => (
    <div className='hours' style={{ top: `${hour.top - 5}px` }}>
        <span className='hourtags'>{hour.label}</span>
    </div>
);

const EVENT_ICONS = { apero: '🍺', repas: '🍔', dodo: '💤', transport: '🚗', course: '🛒', camping: '⛺', ami: '👥', autre: '📍' };

const eventRange = (event) => {
    let start = toFestivalMinutes(event.startTime);
    let end = toFestivalMinutes(event.endTime);
    if (end <= start) end += 24 * 60;
    return { start, end };
};

const roundBtn = {
    background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', borderRadius: '50%',
    width: '32px', height: '32px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
};

const CustomEventOverlay = ({ event, onEdit, columnCount, windowWidth, dayStartMinutes, dayEndMinutes, headerHeight = 100 }) => {
    const { state } = useCheckedState();
    // Hook déclaré avant tout retour anticipé (règle des hooks React)
    const [isMasked, setIsMasked] = useState(false);

    if (typeof event.startTime !== 'string' || typeof event.endTime !== 'string') return null;

    const { start, end } = eventRange(event);
    const top = (state.reverse ? start - dayStartMinutes : dayEndMinutes - end) + headerHeight;
    const colWidth = 300 + (windowWidth * 0.02);

    return (
        <div
            className="custom-event-overlay"
            style={{
                position: 'absolute',
                top: `${top}px`,
                height: `${end - start}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: `${columnCount * colWidth}px`,
                maxWidth: '98%',
                backgroundColor: isMasked ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.45)',
                border: isMasked ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                zIndex: 50,
                pointerEvents: isMasked ? 'none' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 15px',
                color: '#FFFFFF',
                textShadow: isMasked ? 'none' : '0 1px 2px rgba(0,0,0,0.8)',
                backdropFilter: isMasked ? 'none' : 'blur(2px)',
                transition: 'all 0.2s ease'
            }}
        >
            <button
                onClick={(e) => { e.stopPropagation(); setIsMasked(!isMasked); }}
                style={{ ...roundBtn, position: 'absolute', left: '15px', zIndex: 51, pointerEvents: 'auto' }}
                title={isMasked ? "Afficher" : "Masquer"}
            >
                <i className={isMasked ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"}></i>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', opacity: isMasked ? 0.1 : 1, transition: 'opacity 0.2s' }}>
                <span style={{ fontSize: '1.8rem' }}>{EVENT_ICONS[event.type] || ''}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{event.title}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: '500' }}>{event.startTime} - {event.endTime}</div>
                </div>
            </div>

            <div style={{ position: 'absolute', right: '15px', display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
                <button
                    onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(event); }}
                    style={roundBtn}
                    title="Modifier"
                >
                    <i className="fa-solid fa-pen"></i>
                </button>
            </div>
        </div>
    );
};

/**
 * Barre de navigation du glissement : une pastille par pôle, dans l'ordre du cercle, avec les noms
 * de scènes en toutes lettres. Elle a la même largeur dans les deux vues, donc tient toujours à l'écran :
 *  - vue compacte : la pastille entière représente le pôle (une colonne) ;
 *  - vue étendue : la pastille est coupée en deux segments, un par scène (une colonne chacune).
 * Segments visibles en surbrillance, compteur de favoris des colonnes masquées. Un tap amène la colonne à l'écran.
 */
const SlideBar = ({ items, visibleIds, favoritesById, onSelect }) => (
    <div className="pole-bar" role="toolbar" aria-label="Colonnes de scènes">
        {items.map(item => {
            const hidden = item.segments.filter(seg => !visibleIds.includes(seg.id));
            const count = hidden.reduce((n, seg) => n + (favoritesById[seg.id] || 0), 0);
            const single = item.segments.length === 1;
            return (
                <div
                    key={item.id}
                    className={`pole-chip${single ? ' single' : ''}${hidden.length === 0 ? ' visible' : ''}`}
                    style={{ '--pole-color': item.color }}
                    title={item.title}
                >
                    {item.segments.map(seg => {
                        const isVisible = visibleIds.includes(seg.id);
                        return (
                            <button
                                key={seg.id}
                                className={`pole-chip-seg${isVisible ? ' visible' : ''}`}
                                style={{ '--seg-color': seg.color, ...(seg.background ? { '--seg-bg': seg.background } : {}) }}
                                onClick={() => onSelect(seg.id)}
                                aria-pressed={isVisible}
                                aria-label={seg.title}
                            >
                                {seg.lines.map((line, i) => (
                                    <span key={line} className="pole-chip-line" style={isVisible && seg.lineColors ? { color: seg.lineColors[i] } : undefined}>{line}</span>
                                ))}
                            </button>
                        );
                    })}
                    {count > 0 && <span className="pole-chip-badge">{count}</span>}
                </div>
            );
        })}
    </div>
);

/** Repère « maintenant » : trait horizontal sur toute la largeur des colonnes, heure en étiquette. */
const NowLine = React.forwardRef(({ top, label }, ref) => (
    <div ref={ref} className="now-line" style={{ top: `${top}px` }} aria-label={`Heure actuelle : ${label}`}>
        <span className="now-line-label">{label}</span>
    </div>
));
NowLine.displayName = 'NowLine';

const mod = (n, m) => ((n % m) + m) % m;

const DayView = ({ groups, selectGroup, selectedGroupId, day, customEvents = [], onEditCustomEvent }) => {
    const { state, setState, getUserBandTag, stageTheme } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [tagMenuState, setTagMenuState] = useState({ open: false, groupId: null, position: { x: 0, y: 0 } });
    const [headerHeight, setHeaderHeight] = useState(125);
    // Piste de glissement (mobile portrait) : décalage en px par rapport à la position de repos,
    // transition active ou non, et cran à valider à la fin de l'animation (+1 gauche, -1 droite)
    const [track, setTrack] = useState({ x: 0, transition: false, pendingStep: 0 });
    const [viewportWidth, setViewportWidth] = useState(0);
    const gestureRef = useRef({ axis: null, ignore: false });
    const commitTimerRef = useRef(null);
    const pendingStepRef = useRef(0);
    const viewportObserverRef = useRef(null);
    const viewportRefCallback = useCallback((node) => {
        if (viewportObserverRef.current) { viewportObserverRef.current.disconnect(); viewportObserverRef.current = null; }
        if (!node) return;
        setViewportWidth(node.clientWidth);
        const ro = new ResizeObserver(() => setViewportWidth(node.clientWidth));
        ro.observe(node);
        viewportObserverRef.current = ro;
    }, []);
    const observerRef = useRef(null);
    const headerRefCallback = useCallback((node) => {
        if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
        if (!node) return;
        // +25 = margin-bottom de .compact-scene-couple-header, +10 = margin-top de .scene-bands (doit suivre le CSS)
        setHeaderHeight(node.offsetHeight + 35);
        const ro = new ResizeObserver(() => setHeaderHeight(node.offsetHeight + 35));
        ro.observe(node);
        observerRef.current = ro;
    }, []);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const currentDay = day || (groups && groups.length > 0 ? groups[0].DAY : EDITION.defaultDay);
    const todaysEvents = customEvents.filter(e => e.day === currentDay);

    const isSceneVisible = useCallback((sceneName) => {
        const config = STAGE_CONFIG[sceneName];
        if (!config) return false;
        return state.scenes[config.slug] !== false;
    }, [state.scenes]);

    // Fond de colonne : texture du pôle à l'intensité choisie dans les Paramètres (0 = couleur unie)
    const textureIntensity = textureIntensityOf(state);
    const columnBg = useCallback((stageKeys) => (
        textureIntensity <= 0 ? poleBackground(stageKeys, stageTheme) : poleTexture(stageKeys, textureIntensity, stageTheme)
    ), [textureIntensity, stageTheme]);

    // Groupes par scène pour la journée
    const groupsByStage = useMemo(() => {
        const map = {};
        (groups || []).forEach(g => {
            if (!map[g.SCENE]) map[g.SCENE] = [];
            map[g.SCENE].push(g);
        });
        return map;
    }, [groups]);

    // Pôles actifs ce jour : au moins une scène visible qui a des groupes
    const activePoles = useMemo(() => POLES.filter(p =>
        p.stages.some(s => isSceneVisible(s) && (groupsByStage[s] || []).length > 0)
    ).map(p => p.id), [groupsByStage, isSceneVisible]);

    // Scènes actives ce jour (vue étendue) : visibles et avec des groupes
    const activeScenes = useMemo(() => MAIN_STAGES.filter(st =>
        isSceneVisible(st) && (groupsByStage[st] || []).length > 0
    ), [groupsByStage, isSceneVisible]);

    // --- Mode d'affichage ---
    // Vue compacte : colonnes = pôles. Vue étendue : colonnes = scènes.
    // Dans les deux cas, si toutes les colonnes ne tiennent pas, une fenêtre glisse en boucle sur le cercle des colonnes.
    const isExtendedView = !state.compact && windowWidth >= DV.extendedViewMinWidth;
    const ring = isExtendedView ? MAIN_STAGES : POLES.map(p => p.id);
    const activeIds = isExtendedView ? activeScenes : activePoles;
    const offsetKey = isExtendedView ? 'sceneOffset' : 'poleOffset';
    const fitCount = isExtendedView
        ? Math.max(3, Math.floor(windowWidth / DV.extendedSlideColumnWidth))
        : DV.visiblePolesPortrait;
    const showAllPoles = isExtendedView
        ? windowWidth >= DV.extendedAllMinWidth || activeIds.length <= fitCount
        : windowWidth >= DV.allPolesMinWidth || activeIds.length <= fitCount;
    const windowSize = showAllPoles ? activeIds.length : Math.min(fitCount, activeIds.length - 1);

    // Fenêtre glissante : on part de la colonne d'indice `offset` dans le cercle, en ne gardant que les actives
    const offset = mod(state[offsetKey] || 0, ring.length);
    const rotatedActive = useMemo(() => {
        const ordered = [...ring.slice(offset), ...ring.slice(0, offset)];
        return ordered.filter(id => activeIds.includes(id));
    }, [offset, activeIds, ring]);
    const visiblePoleIds = showAllPoles
        ? ring.filter(id => activeIds.includes(id))
        : rotatedActive.slice(0, windowSize);

    const colW = (viewportWidth || windowWidth) / Math.max(1, windowSize);
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Valide un cran de glissement : le pôle suivant (ou précédent) devient le premier visible
    const commitStep = useCallback((step) => {
        if (rotatedActive.length === 0) return;
        const nextFirst = step > 0 ? rotatedActive[1] : rotatedActive[rotatedActive.length - 1];
        setState(prev => ({ ...prev, [offsetKey]: ring.indexOf(nextFirst) }));
        setTrack({ x: 0, transition: false, pendingStep: 0 });
    }, [rotatedActive, setState, offsetKey, ring]);

    // Fin de transition : valide le cran en attente (une seule fois, même si le filet de sécurité se déclenche aussi)
    const finishAnimation = useCallback(() => {
        clearTimeout(commitTimerRef.current);
        const step = pendingStepRef.current;
        if (step) {
            pendingStepRef.current = 0;
            commitStep(step);
        } else {
            setTrack(prev => (prev.transition ? { ...prev, transition: false } : prev));
        }
    }, [commitStep]);

    // Anime la piste d'une colonne entière puis valide le cran
    const animateStep = useCallback((step) => {
        if (showAllPoles || rotatedActive.length <= windowSize) return;
        const target = step > 0 ? -colW : colW;
        // Déjà en bout de course (doigt tiré d'une colonne entière) : rien à animer
        if (reducedMotion || Math.abs(track.x - target) < 1) { commitStep(step); return; }
        pendingStepRef.current = step;
        setTrack({ x: target, transition: true, pendingStep: step });
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = setTimeout(finishAnimation, 400); // filet de sécurité si transitionend ne vient pas
    }, [showAllPoles, rotatedActive, windowSize, reducedMotion, commitStep, colW, finishAnimation, track.x]);

    useEffect(() => () => clearTimeout(commitTimerRef.current), []);

    const showPole = useCallback((poleId) => {
        if (visiblePoleIds.includes(poleId)) return;
        const idxInRing = rotatedActive.indexOf(poleId);
        // Glisser du nombre minimal de crans pour faire entrer ce pôle
        const forward = idxInRing - (windowSize - 1);
        const backward = rotatedActive.length - idxInRing;
        if (Math.min(forward, backward) === 1) { animateStep(forward <= backward ? 1 : -1); return; }
        const firstId = forward <= backward ? rotatedActive[forward] : rotatedActive[idxInRing];
        setState(prev => ({ ...prev, [offsetKey]: ring.indexOf(firstId) }));
    }, [visiblePoleIds, rotatedActive, windowSize, setState, animateStep, offsetKey, ring]);

    // Swipe : les colonnes suivent le doigt, puis glissent d'un cran (le changement de jour passe par les onglets)
    const swipeEnabled = !showAllPoles && rotatedActive.length > windowSize;
    const swipeHandlers = useSwipeable({
        onSwipeStart: (e) => {
            gestureRef.current = {
                axis: null,
                ignore: !swipeEnabled
                    || track.pendingStep !== 0
                    || e.initial[0] < 24 // bord gauche : geste « retour » de Safari iOS
                    || !!e.event.target.closest?.('.group-card'),
            };
        },
        onSwiping: (e) => {
            const g = gestureRef.current;
            if (g.ignore) return;
            if (!g.axis) g.axis = e.absX > e.absY ? 'x' : 'y'; // verrouillage de direction au premier mouvement
            if (g.axis !== 'x') return;
            setTrack({ x: Math.max(-colW, Math.min(colW, e.deltaX)), transition: false, pendingStep: 0 });
        },
        onSwiped: (e) => {
            const g = gestureRef.current;
            if (g.ignore || g.axis !== 'x') return;
            const passed = e.absX > colW * 0.25 || (e.velocity > 0.5 && e.absX > 20);
            if (passed) animateStep(e.deltaX < 0 ? 1 : -1);
            else setTrack({ x: 0, transition: !reducedMotion, pendingStep: 0 }); // retour en place
        },
        delta: 10,
        preventScrollOnSwipe: false,
        trackMouse: false,
        touchEventOptions: { passive: true },
    });

    // --- Favoris par colonne (barre de glissement) ---
    const columnOf = useCallback((g) => (isExtendedView ? g.SCENE : STAGE_CONFIG[g.SCENE]?.pole), [isExtendedView]);
    const favoritesByPole = useMemo(() => {
        const byCol = {};
        (groups || []).filter(g => getUserBandTag(g.id)?.interest && isSceneVisible(g.SCENE)).forEach(g => {
            const col = columnOf(g);
            if (col) byCol[col] = (byCol[col] || 0) + 1;
        });
        return byCol;
    }, [groups, getUserBandTag, isSceneVisible, columnOf]);

    // --- Bornes horaires : toutes les scènes visibles du jour (stables pendant le glissement) ---
    const { dayStartMinutes, dayEndMinutes } = useMemo(() => {
        const fallback = EDITION.days.find(d => d.key === currentDay)?.fallback || { start: 10 * 60, end: 26 * 60 };
        let minStart = Infinity;
        let maxEnd = -Infinity;
        (groups || []).forEach(g => {
            if (!g.DEBUT || !g.FIN || !isSceneVisible(g.SCENE)) return;
            const r = bandRange(g);
            minStart = Math.min(minStart, r.start);
            maxEnd = Math.max(maxEnd, r.end);
        });
        todaysEvents.forEach(e => {
            const r = eventRange(e);
            minStart = Math.min(minStart, r.start);
            maxEnd = Math.max(maxEnd, r.end);
        });
        return {
            dayStartMinutes: minStart === Infinity ? fallback.start : minStart,
            dayEndMinutes: maxEnd === -Infinity ? fallback.end : maxEnd,
        };
    }, [groups, todaysEvents, isSceneVisible, currentDay]);

    const hours = useMemo(() => {
        const list = [];
        for (let h = Math.floor(dayStartMinutes / 60); h <= Math.ceil(dayEndMinutes / 60); h++) {
            const displayH = h >= 24 ? h - 24 : h;
            const t = h * 60;
            list.push({
                label: `${String(displayH).padStart(2, '0')}:00`,
                top: state.reverse ? t - dayStartMinutes : dayEndMinutes - t,
            });
        }
        return list;
    }, [dayStartMinutes, dayEndMinutes, state.reverse]);

    // --- Repère « maintenant » : jour affiché = jour festival en cours, heure dans les bornes du jour ---
    const { festivalDay, festivalMinutes } = useFestivalNow();
    const showNowLine = festivalDay === currentDay && festivalMinutes >= dayStartMinutes && festivalMinutes <= dayEndMinutes;
    const nowTop = headerHeight + (state.reverse ? festivalMinutes - dayStartMinutes : dayEndMinutes - festivalMinutes);
    const nowLineRef = useRef(null);
    const scrolledDayRef = useRef(null);
    // À l'ouverture du jour en cours, amener le repère au centre de l'écran (une fois par jour affiché)
    useEffect(() => {
        if (!showNowLine) return;
        if (scrolledDayRef.current === currentDay) return;
        scrolledDayRef.current = currentDay;
        nowLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [showNowLine, currentDay]);

    const gradientOffset = state.reverse
        ? `${(60 - dayStartMinutes % 60) % 60}px`
        : `${dayEndMinutes % 60}px`;

    const handleTagClick = (groupId, position) => {
        const menuWidth = 240;
        const menuHeight = 350;
        let { x, y } = position;
        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
        setTagMenuState({ open: true, groupId, position: { x, y } });
    };
    const closeTagMenu = () => setTagMenuState({ open: false, groupId: null, position: { x: 0, y: 0 } });

    if (!groups) return null;

    const bandsHeight = `${dayEndMinutes - dayStartMinutes}px`;

    const renderBand = (group, extra = {}) => (
        <Band
            key={group.id}
            group={group}
            selectGroup={selectGroup}
            selectedGroupId={selectedGroupId}
            onTagClick={handleTagClick}
            dayStartMinutes={dayStartMinutes}
            dayEndMinutes={dayEndMinutes}
            {...extra}
        />
    );

    const overlays = (columnCount) => (
        <>
            {tagMenuState.open && (
                <TagMenu groupId={tagMenuState.groupId} position={tagMenuState.position} onClose={closeTagMenu} />
            )}
            {showNowLine && <NowLine ref={nowLineRef} top={nowTop} label={formatMinutes(festivalMinutes)} />}
            {todaysEvents.map(event => (
                <CustomEventOverlay
                    key={event.id}
                    event={event}
                    onEdit={onEditCustomEvent}
                    columnCount={columnCount}
                    windowWidth={windowWidth}
                    dayStartMinutes={dayStartMinutes}
                    dayEndMinutes={dayEndMinutes}
                    headerHeight={headerHeight}
                />
            ))}
        </>
    );

    // VUE ÉTENDUE : une colonne par scène
    const renderSceneColumn = (sceneName, { key, headerRef = false, style = {} } = {}) => {
        const config = STAGE_CONFIG[sceneName];
        return (
            <div key={key} className="scene-column compact-scene-column scene-solo-column" style={{ background: columnBg([sceneName]), border: 'none', ...style }}>
                <div className="compact-scene-couple-header" ref={headerRef ? headerRefCallback : null} style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                    <SceneHeader config={config} sceneName={sceneName} />
                </div>
                <div className="scene-bands with-hours" style={{ height: bandsHeight, backgroundPositionY: gradientOffset }}>
                    {hours.map((hour, i) => <HourTag key={i} hour={hour} />)}
                    {(groupsByStage[sceneName] || []).map(g => renderBand(g))}
                </div>
            </div>
        );
    };

    if (isExtendedView && !swipeEnabled) {
        const manyColumns = activeScenes.length > 6;
        return (
            <div className="compact-day extended-view" style={{ position: 'relative', gap: `${manyColumns ? 2 : 5}px`, overflowX: 'visible', touchAction: 'pan-y' }}>
                {activeScenes.map((sceneName, index) => renderSceneColumn(sceneName, {
                    key: sceneName,
                    headerRef: index === 0,
                    style: manyColumns ? { margin: '0 0.2%' } : {},
                }))}
                {overlays(activeScenes.length)}
            </div>
        );
    }

    // MODE PÔLES : une colonne par pôle (les 2 scènes alternent)
    const renderPoleColumn = (pole, { key, headerRef = false, style = {} } = {}) => {
        const [scene1, scene2] = pole.stages;
        const showS1 = isSceneVisible(scene1);
        const showS2 = isSceneVisible(scene2);
        const groups1 = showS1 ? (groupsByStage[scene1] || []) : [];
        const groups2 = showS2 ? (groupsByStage[scene2] || []) : [];
        const shown = [showS1 && scene1, showS2 && scene2].filter(Boolean);

        return (
            <div key={key} className="scene-column compact-scene-column pole-column" style={{ background: columnBg(shown), ...style }}>
                <div className="compact-scene-couple-header" ref={headerRef ? headerRefCallback : null}>
                    {shown.map(sceneName => (
                        <div key={sceneName} className="header-half" style={{ width: shown.length === 2 ? '50%' : '100%' }}>
                            <SceneHeader config={STAGE_CONFIG[sceneName]} sceneName={sceneName} />
                        </div>
                    ))}
                </div>
                {/* Repères horaires masqués en vue par pôles (illisibles sous les cartes), conservés en vue étendue.
                    Réactivables via EDITION.dayView.poleViewHours. */}
                <div
                    className={`scene-bands${DV.poleViewHours ? ' with-hours' : ''}`}
                    style={{ height: bandsHeight, ...(DV.poleViewHours ? { backgroundPositionY: gradientOffset } : {}) }}
                >
                    {DV.poleViewHours && hours.map((hour, i) => <HourTag key={i} hour={hour} />)}
                    {/* Les scènes d'un pôle alternent ; en cas de chevauchement, demi-largeur */}
                    {groups1.map(g => renderBand(g, { halfWidth: overlapsWithAny(g, groups2), side: 'left', stageEdge: 'left' }))}
                    {groups2.map(g => renderBand(g, { halfWidth: overlapsWithAny(g, groups1), side: 'right', stageEdge: 'right' }))}
                </div>
            </div>
        );
    };

    const poleById = (id) => POLES.find(p => p.id === id);

    // Vue compacte, écran large / paysage, ou peu de pôles actifs : tout est visible, pas de glissement
    if (!swipeEnabled) {
        const visiblePoles = visiblePoleIds.map(poleById);
        return (
            <div className="day-view-poles">
                <div className="compact-day" style={{ position: 'relative', overflowX: 'visible', touchAction: 'pan-y' }}>
                    {visiblePoles.map((pole, index) => renderPoleColumn(pole, { key: pole.id, headerRef: index === 0 }))}
                    {overlays(visiblePoles.length)}
                </div>
            </div>
        );
    }

    // Glissement (vue compacte en portrait, vue étendue sous 1601 px) :
    // piste [précédent | N visibles | suivant], décalée d'une colonne au repos.
    // Pendant le geste, toute la piste suit le doigt ; au relâchement elle glisse d'une colonne entière.
    const slots = [
        { id: rotatedActive[rotatedActive.length - 1], role: 'prev' },
        ...rotatedActive.slice(0, windowSize).map(id => ({ id, role: 'visible' })),
        { id: rotatedActive[windowSize % rotatedActive.length], role: 'next' },
    ];
    const ids = slots.map(sl => sl.id);
    // Noms en toutes lettres, regroupés par pôle dans les deux vues (la barre garde la même largeur) :
    // vue compacte, un bloc par pôle (« Warzone / Riot » sur deux lignes, « Main stages ») ;
    // vue étendue, un segment par scène (« Main 1 » / « Main 2 » pour tenir dans la pastille)
    const sceneLabel = (st) => (STAGE_CONFIG[st].name.startsWith('Mainstage') ? STAGE_CONFIG[st].name.replace('stage', '') : STAGE_CONFIG[st].name);
    const barItems = POLES.filter(p => (isExtendedView ? p.stages.some(st => activeScenes.includes(st)) : activePoles.includes(p.id)))
        .map(p => ({
            id: p.id,
            color: poleColor(p, stageTheme),
            title: p.name,
            segments: isExtendedView
                ? p.stages.filter(st => activeScenes.includes(st)).map(st => ({
                    id: st, lines: [sceneLabel(st)], color: stageTheme[st].themeColor, title: STAGE_CONFIG[st].name,
                }))
                : [{
                    id: p.id,
                    lines: p.id === 'MS' ? ['Main', 'stages'] : p.stages.map(st => STAGE_CONFIG[st].name),
                    color: poleColor(p, stageTheme),
                    // Fond en deux moitiés : haut = 1re scène, bas = 2e (une seule couleur si l'autre est filtrée)
                    background: (() => {
                        const cols = p.stages.filter(st => activeScenes.includes(st)).map(st => stageTheme[st].themeColor);
                        return cols.length === 2 ? `linear-gradient(to bottom, ${cols[0]} 50%, ${cols[1]} 50%)` : cols[0];
                    })(),
                    // Texte de chaque moitié : noir ou blanc selon ce qui contraste le mieux avec la couleur de sa scène
                    lineColors: (() => {
                        const cols = p.stages.filter(st => activeScenes.includes(st)).map(st => stageTheme[st].themeColor);
                        const ink = (c) => (chroma.contrast(c, '#111') >= chroma.contrast(c, '#fff') ? '#111' : '#fff');
                        if (cols.length < 2) return [ink(cols[0]), ink(cols[0])];
                        // « Main stages » est un seul libellé sur deux lignes : une seule encre, la plus lisible sur les deux moitiés
                        if (p.id === 'MS') {
                            const best = ['#111', '#fff'].reduce((a, b) => (Math.min(...cols.map(c => chroma.contrast(c, b))) > Math.min(...cols.map(c => chroma.contrast(c, a))) ? b : a));
                            return [best, best];
                        }
                        return cols.map(ink);
                    })(),
                    title: p.name,
                }],
        }));
    const renderSlot = (id, opts) => (isExtendedView ? renderSceneColumn(id, opts) : renderPoleColumn(poleById(id), opts));
    const slotKey = (sl, i) => (ids.indexOf(sl.id) === ids.lastIndexOf(sl.id) ? sl.id : `${sl.id}-${i}`);
    const COL_GAP = 6;

    return (
        <div className="day-view-poles">
            <SlideBar
                items={barItems}
                visibleIds={visiblePoleIds}
                favoritesById={favoritesByPole}
                onSelect={showPole}
            />
            <div className="pole-stage" style={{ position: 'relative' }}>
                <div className="pole-viewport" ref={viewportRefCallback} {...swipeHandlers}>
                    <div
                        className="pole-track"
                        style={{
                            width: `${colW * slots.length}px`,
                            transform: `translate3d(${-colW + track.x}px, 0, 0)`,
                            transition: track.transition ? 'transform 260ms cubic-bezier(0.2, 0.7, 0.2, 1)' : 'none',
                        }}
                        onTransitionEnd={(e) => { if (e.target === e.currentTarget) finishAnimation(); }}
                    >
                        {slots.map((sl, i) => (
                            <div
                                key={slotKey(sl, i)}
                                className="pole-slot"
                                style={{ width: `${colW}px`, padding: `0 ${COL_GAP / 2}px` }}
                                aria-hidden={sl.role !== 'visible'}
                            >
                                {renderSlot(sl.id, {
                                    headerRef: i === 1,
                                    style: { width: '100%', maxWidth: 'none', margin: '0 0 20px' },
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                {overlays(windowSize)}
            </div>
        </div>
    );
};

export default DayView;
