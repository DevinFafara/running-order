import React from 'react';

/**
 * StageMarker — Positioned marker on the festival map for a single stage.
 *
 * The dot is centered on the map coordinates.
 * The pulse ring lives inside the dot so it's always centered on it.
 * The chip is absolutely positioned below the dot.
 */
const StageMarker = ({ stageKey, stageData, onSelect, counterTransform }) => {
    const { playing, next, status, config } = stageData;

    if (!config || !config.mapPosition) return null;

    const { left, top } = config.mapPosition;
    const color = config.themeColor;

    const displayGroup = playing || next;
    const isPlaying = status === 'playing';
    const isNext = status === 'next';

    const handleClick = (e) => {
        e.stopPropagation();
        if (displayGroup && onSelect) onSelect(displayGroup);
    };

    return (
        <div
            className={`stage-marker stage-marker--${status}`}
            style={{ left, top }}
            onClick={handleClick}
        >
            {/* Counter-transform wrapper: cancels map zoom + rotation */}
            <div className="stage-marker__inner" style={{ transform: counterTransform }}>

                {/* Icon dot — pulse ring lives INSIDE so it's always centered on the dot */}
                <div
                    className="stage-marker__dot"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}99` }}
                >
                    {isPlaying && (
                        <div className="stage-marker__pulse" style={{ borderColor: color }} />
                    )}
                    <img src={config.icon} alt={config.name} className="stage-marker__icon" />
                </div>

                {/* Info chip — absolutely positioned below the dot */}
                <div className={`stage-marker__chip stage-marker__chip--${status}`}>
                    <span className="stage-marker__chip-stage" style={{ color }}>
                        {config.name}
                    </span>

                    {isPlaying && displayGroup && (
                        <>
                            <span className="stage-marker__chip-badge stage-marker__chip-badge--live">● LIVE</span>
                            <span className="stage-marker__chip-band">{displayGroup.GROUPE}</span>
                            <span className="stage-marker__chip-time">
                                {displayGroup.DEBUT?.replace('h', ':')}&ndash;{displayGroup.FIN?.replace('h', ':')}
                            </span>
                        </>
                    )}

                    {isNext && displayGroup && (
                        <>
                            <span className="stage-marker__chip-badge stage-marker__chip-badge--next">Prochain</span>
                            <span className="stage-marker__chip-band">{displayGroup.GROUPE}</span>
                            <span className="stage-marker__chip-time">{displayGroup.DEBUT?.replace('h', ':')}</span>
                        </>
                    )}

                    {status === 'idle' && (
                        <span className="stage-marker__chip-idle">—</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StageMarker;
