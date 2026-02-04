import React, { createContext, useState, useEffect, useContext } from 'react';
import { DEFAULT_COLORS, INTEREST_LEVELS, CONTEXT_TAGS } from '../constants';

export const CheckedStateContext = createContext();

// Générer les couleurs par défaut des niveaux d'intérêt
const getDefaultInterestColors = () => {
    const colors = {};
    Object.keys(INTEREST_LEVELS).forEach(levelId => {
        colors[levelId] = INTEREST_LEVELS[levelId].defaultColor;
    });
    return colors;
};

const INITIAL_STATE = {
    scenes: {
        // Scènes principales
        mainstage1: true,
        mainstage2: true,
        warzone: true,
        valley: true,
        altar: true,
        temple: true,
        // Scènes annexes (visibles seulement si sideScenes = true)
        hellstage: true,
        purple_house: true,
        metal_corner: true,
    },
    color: 'nocolor',
    ...DEFAULT_COLORS,
    // Nouveau système à 2 dimensions :
    // { groupId: { interest: 'must_see' | 'interested' | 'curious' | null, context: 'with_friend' | 'strategic' | 'skip' | null, taggedAt: timestamp } }
    taggedBands: {},
    // Couleurs personnalisées pour les niveaux d'intérêt (les 3 étoiles)
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

                // Merge profond et intelligent
                const mergedState = {
                    ...INITIAL_STATE,
                    ...parsed,
                    // S'assurer que les nouvelles clés de scènes sont présentes
                    scenes: {
                        ...INITIAL_STATE.scenes,
                        ...(parsed.scenes || {})
                    },
                    // S'assurer que les nouvelles clés de couleurs sont présentes
                    interestColors: {
                        ...getDefaultInterestColors(),
                        ...(parsed.interestColors || {})
                    }
                };
                return mergedState;
            }
        } catch (e) {
            console.error("Failed to load state", e);
        }
        return INITIAL_STATE;
    });

    useEffect(() => {
        localStorage.setItem('checkedState', JSON.stringify(state));
    }, [state]);

    const resetState = () => {
        setState(INITIAL_STATE);
    };

    const setDay = (day) => {
        setState(prev => ({ ...prev, day }));
    };

    // Définir le niveau d'intérêt d'un groupe (null pour retirer)
    const setInterest = (groupId, interestLevel) => {
        setState(prev => {
            const newTaggedBands = { ...prev.taggedBands };
            const existing = newTaggedBands[groupId] || {};

            if (interestLevel === null && !existing.context) {
                // Retirer complètement si plus rien
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

    // Définir le contexte d'un groupe (null pour retirer)
    const setContext = (groupId, contextType) => {
        setState(prev => {
            const newTaggedBands = { ...prev.taggedBands };
            const existing = newTaggedBands[groupId] || {};

            if (contextType === null && !existing.interest) {
                // Retirer complètement si plus rien
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

    // Toggle rapide d'intérêt (cycle: null -> curious -> interested -> must_see -> null)
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

    // Obtenir les infos de tag d'un groupe (avec migration des anciens formats)
    const getBandTag = (groupId) => {
        const tag = state.taggedBands?.[groupId];
        if (!tag) return null;

        // Migration : si le tag est une ancienne chaîne (ex: 'color1' ou 'must_see')
        if (typeof tag === 'string') {
            return {
                interest: 'must_see', // Par défaut pour les anciens tags
                context: null,
                taggedAt: Date.now()
            };
        }

        // Migration : ancien format { category: 'xxx' }
        if (tag.category && !tag.interest) {
            const cat = tag.category;
            // Mapper l'ancienne catégorie vers le nouveau système
            if (['must_see', 'interested', 'curious'].includes(cat)) {
                return { interest: cat, context: null, taggedAt: tag.taggedAt };
            } else if (['with_friend', 'strategic', 'skip'].includes(cat)) {
                return { interest: null, context: cat, taggedAt: tag.taggedAt };
            }
        }

        return tag;
    };

    // Obtenir la couleur d'un niveau d'intérêt
    const getInterestColor = (interestLevel) => {
        return state.interestColors?.[interestLevel] || INTEREST_LEVELS[interestLevel]?.defaultColor || '#888';
    };

    // Personnaliser la couleur d'un niveau d'intérêt
    const setInterestColor = (interestLevel, color) => {
        setState(prev => ({
            ...prev,
            interestColors: {
                ...prev.interestColors,
                [interestLevel]: color
            }
        }));
    };

    // Réinitialiser les couleurs
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
            state,
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
