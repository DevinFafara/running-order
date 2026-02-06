import React, { createContext, useState, useEffect, useContext } from 'react';
import { DEFAULT_COLORS, INTEREST_LEVELS, CONTEXT_TAGS } from '../constants';
import { migrateOldData } from '../utils/migrationUtils';

export const CheckedStateContext = createContext();

const getDefaultInterestColors = () => {
    const colors = {};
    Object.keys(INTEREST_LEVELS).forEach(levelId => {
        colors[levelId] = INTEREST_LEVELS[levelId].defaultColor;
    });
    return colors;
};

const INITIAL_STATE = {
    scenes: {
        mainstage1: true,
        mainstage2: true,
        warzone: true,
        valley: true,
        altar: true,
        temple: true,
        hellstage: true,
        purple_house: true,
        metal_corner: true,
    },
    color: 'nocolor',
    ...DEFAULT_COLORS,
    taggedBands: {},
    interestColors: getDefaultInterestColors(),
    reverse: false,
    compact: true,
    notes: {},
    myRo: {
        color1: "full",
        color2: "full",
        color3: "full",
        others: "none",
    },
    day: "Jeudi",
    sideScenes: false,
    language: "fr",
};

export const CheckedStateProvider = ({ children }) => {
    const [state, setState] = useState(() => {
        try {
            const saved = localStorage.getItem('checkedState');
            if (saved) {
                const parsed = JSON.parse(saved);
                const migrated = migrateOldData(parsed);

                const mergedState = {
                    ...INITIAL_STATE,
                    ...migrated,
                    scenes: {
                        ...INITIAL_STATE.scenes,
                        ...(migrated.scenes || {})
                    },
                    interestColors: {
                        ...getDefaultInterestColors(),
                        ...(migrated.interestColors || {})
                    }
                };
                return mergedState;
            }
        } catch (e) {
            console.error("Failed to load state", e);
        }
        return INITIAL_STATE;
    });

    const [guestRo, setGuestRo] = useState(null);

    const displayState = React.useMemo(() => {
        if (guestRo && guestRo.bands) {
            return {
                ...state,
                taggedBands: guestRo.bands
            };
        }
        return state;
    }, [state, guestRo]);

    useEffect(() => {
        localStorage.setItem('checkedState', JSON.stringify(state));
    }, [state]);

    const resetState = () => {
        setState(INITIAL_STATE);
    };

    const setDay = (day) => {
        setState(prev => ({ ...prev, day }));
    };

    const setInterest = (groupId, interestLevel) => {
        if (guestRo) return;
        setState(prev => {
            const newTaggedBands = { ...prev.taggedBands };
            const existing = newTaggedBands[groupId] || {};

            if (interestLevel === null && !existing.context) {
                delete newTaggedBands[groupId];
            } else {
                newTaggedBands[groupId] = {
                    ...existing,
                    interest: interestLevel,
                    taggedAt: Date.now()
                };
            }
            return { ...prev, taggedBands: newTaggedBands };
        });
    };

    const setContext = (groupId, contextType) => {
        if (guestRo) return;
        setState(prev => {
            const newTaggedBands = { ...prev.taggedBands };
            const existing = newTaggedBands[groupId] || {};

            if (contextType === null && !existing.interest) {
                delete newTaggedBands[groupId];
            } else {
                newTaggedBands[groupId] = {
                    ...existing,
                    context: contextType,
                    taggedAt: Date.now()
                };
            }
            return { ...prev, taggedBands: newTaggedBands };
        });
    };

    const cycleInterest = (groupId) => {
        const currentTag = getBandTag(groupId);
        const currentInterest = currentTag?.interest;

        let nextInterest;
        if (!currentInterest) {
            nextInterest = 'curious';
        } else if (currentInterest === 'curious') {
            nextInterest = 'interested';
        } else if (currentInterest === 'interested') {
            nextInterest = 'must_see';
        } else {
            nextInterest = null;
        }

        setInterest(groupId, nextInterest);
    };

    const getBandTag = (groupId) => {
        const tag = displayState.taggedBands?.[groupId];
        if (!tag) return null;

        if (typeof tag === 'string') {
            return {
                interest: 'must_see',
                context: null,
                taggedAt: Date.now()
            };
        }

        if (tag.category && !tag.interest) {
            const cat = tag.category;
            if (['must_see', 'interested', 'curious'].includes(cat)) {
                return { interest: cat, context: null, taggedAt: tag.taggedAt };
            } else if (['with_friend', 'strategic', 'skip'].includes(cat)) {
                return { interest: null, context: cat, taggedAt: tag.taggedAt };
            }
        }

        return tag;
    };

    const getInterestColor = (interestLevel) => {
        return state.interestColors?.[interestLevel] || INTEREST_LEVELS[interestLevel]?.defaultColor || '#888';
    };

    const setInterestColor = (interestLevel, color) => {
        setState(prev => ({
            ...prev,
            interestColors: {
                ...prev.interestColors,
                [interestLevel]: color
            }
        }));
    };

    const resetInterestColors = () => {
        setState(prev => ({
            ...prev,
            interestColors: getDefaultInterestColors()
        }));
    };

    const updateNote = (groupId, note) => {
        setState(prev => ({
            ...prev,
            notes: {
                ...prev.notes,
                [groupId]: note
            }
        }));
    };

    const toggleScene = (sceneId) => {
        setState(prev => ({
            ...prev,
            scenes: {
                ...prev.scenes,
                [sceneId]: !prev.scenes[sceneId]
            }
        }));
    };

    const setScenes = (scenes) => {
        setState(prev => ({
            ...prev,
            scenes
        }));
    };

    const clearAllFavorites = () => {
        setState(prev => ({
            ...prev,
            taggedBands: {}
        }));
    };

    return (
        <CheckedStateContext.Provider value={{
            state: displayState,
            userState: state,
            isGuestMode: !!guestRo,
            guestRo,
            setGuestRo,
            setState,
            resetState,
            setDay,
            setInterest,
            setContext,
            cycleInterest,
            getBandTag,
            getInterestColor,
            setInterestColor,
            resetInterestColors,
            updateNote,
            toggleScene,
            setScenes,
            clearAllFavorites
        }}>
            {children}
        </CheckedStateContext.Provider>
    );
};

export const useCheckedState = () => {
    const context = useContext(CheckedStateContext);
    if (!context) {
        throw new Error('useCheckedState must be used within a CheckedStateProvider');
    }
    return context;
};
