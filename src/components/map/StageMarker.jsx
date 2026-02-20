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

    // Alignment: MS1, Warzone and Altar have info on the left
    const isLeftAligned = stageKey === 'MAINSTAGE_1' || stageKey === 'WARZONE' || stageKey === 'ALTAR';

    const handleClick = (e) => {
        e.stopPropagation();
        if (displayGroup && onSelect) onSelect(displayGroup);
    };

    return (
        <div
            className={`stage-marker stage-marker--${status} ${isLeftAligned ? 'stage-marker--left' : 'stage-marker--right'}`}
            style={{ left, top }}
            onClick={handleClick}
        >
            {/* Counter-transform wrapper: cancels map zoom and anchors the icon center at (0,0) */}
            <div
                className="stage-marker__inner"
                style={{
                    transform: `${counterTransform} translate(${isLeftAligned ? 'calc(-100% + 21px)' : '-21px'}, -21px)`
                }}
            >

                <div className="stage-marker__wrap">
                    {/* Icon dot */}
                    <div
                        className="stage-marker__dot"
                        style={{ backgroundColor: color }}
                    >
                        {isPlaying && (
                            <div className="stage-marker__pulse" style={{ borderColor: color }} />
                        )}
                        <img src={config.icon} alt={config.name} className="stage-marker__icon" />
                    </div>

                    {/* Info chip */}
                    <div className={`stage-marker__chip stage-marker__chip--${status}`}>
                        <div className="stage-marker__chip-header">
                            <span className="stage-marker__chip-stage" style={{ color }}>
                                {config.name}
                            </span>
                            {isPlaying && displayGroup && (
                                <span className="stage-marker__chip-badge stage-marker__chip-badge--live">● LIVE</span>
                            )}
                            {isNext && displayGroup && (
                                <span className="stage-marker__chip-badge stage-marker__chip-badge--next">Prochain</span>
                            )}
                        </div>

                        {displayGroup ? (
                            <div className="stage-marker__chip-content">
                                <span className="stage-marker__chip-band">{displayGroup.GROUPE}</span>
                                <span className="stage-marker__chip-time">
                                    {status === 'playing'
                                        ? `${displayGroup.DEBUT?.replace('h', ':')}—${displayGroup.FIN?.replace('h', ':')}`
                                        : displayGroup.DEBUT?.replace('h', ':')
                                    }
                                </span>
                            </div>
                        ) : (
                            <span className="stage-marker__chip-idle">Inactif</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StageMarker;
