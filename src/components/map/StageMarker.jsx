import React from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { INTEREST_LEVELS, CONTEXT_TAGS } from '../../constants';

/**
 * StageMarker — Positioned marker on the festival map for a single stage.
 */
const StageMarker = ({ stageKey, stageData, onSelect, counterTransform }) => {
    const { playing, next, status, config } = stageData;
    const { getBandTag, getInterestColor } = useCheckedState();

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

    // Helper to get user tags for the displayed group
    const getGroupTags = () => {
        if (!displayGroup) return null;
        const tag = getBandTag(displayGroup.id);
        if (!tag) return null;

        const interest = INTEREST_LEVELS[tag.interest];
        const context = CONTEXT_TAGS[tag.context];

        return {
            stars: interest ? interest.stars : 0,
            interestColor: tag.interest ? getInterestColor(tag.interest) : null,
            contextIcon: context ? context.icon : null
        };
    };

    const tags = getGroupTags();

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
                        {status === 'playing' && (
                            <div className="stage-marker__pulse" style={{ borderColor: color }} />
                        )}
                        <img src={config.icon} alt={config.name} className="stage-marker__icon" />

                        {/* Status Badges on the dot edge */}
                        {tags && (
                            <div className="stage-marker__badges">
                                {tags.stars > 0 && (
                                    <div className="stage-marker__badge stage-marker__badge--interest" style={{ color: tags.interestColor }}>
                                        ★
                                    </div>
                                )}
                                {tags.contextIcon && (
                                    <div className="stage-marker__badge stage-marker__badge--context">
                                        {tags.contextIcon}
                                    </div>
                                )}
                            </div>
                        )}
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
