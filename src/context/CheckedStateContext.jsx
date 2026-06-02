import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { DEFAULT_COLORS, INTEREST_LEVELS, CONTEXT_TAGS } from '../constants';
import { migrateOldData } from '../utils/migrationUtils';
import { encodeROForServer, decodeROFromServer, encodeContacts, decodeContacts } from '../utils/sharingUtils';
import { api } from '../services/api';

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
        hellcity_stage: true,
        le_off1: true,
        le_off2: true,
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

const AUTOSAVE_DELAY = 1500; // ms

const toComparable = (bands) =>
    Object.keys(bands).sort()
        .map(id => `${id}:${bands[id]?.interest || ''}:${bands[id]?.context || ''}`)
        .join('|');

export const CheckedStateProvider = ({ children, user }) => {
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

    // ─── Server sync state ──────────────────────────────────────────────
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const [conflictData, setConflictData] = useState(null); // null | { server: {...}, local: {...} }
    const [consentChoice, setConsentChoiceState] = useState(() => {
        return localStorage.getItem('ro_consent') || null; // 'full' | 'private' | 'local_only' | null
    });

    const saveTimeoutRef = useRef(null);
    const savedFadeTimeoutRef = useRef(null);
    const lastSavedEncodedRef = useRef(null); // Track last saved value to avoid redundant saves
    const initialLoadDoneRef = useRef(false);

    // Persist consent choice
    const setConsentChoice = useCallback((choice) => {
        setConsentChoiceState(choice);
        if (choice) {
            localStorage.setItem('ro_consent', choice);
        } else {
            localStorage.removeItem('ro_consent');
        }
    }, []);

    // Should we sync with server?
    const shouldSync = user && consentChoice && consentChoice !== 'local_only';

    const displayState = React.useMemo(() => {
        if (guestRo && guestRo.bands) {
            return {
                ...state,
                taggedBands: guestRo.bands
            };
        }
        return state;
    }, [state, guestRo]);

    // ─── LocalStorage persistence (always active) ───────────────────────
    useEffect(() => {
        localStorage.setItem('checkedState', JSON.stringify(state));
    }, [state]);

    // ─── Custom events (read from App.jsx, needed for server sync) ──────
    // We need access to customEvents for encoding. App.jsx will pass them via context.
    const [customEventsForSync, setCustomEventsForSync] = useState([]);
    const [contactsForSync, setContactsForSync] = useState([]);
    const [serverContacts, setServerContacts] = useState(null); // contacts loaded from server

    // ─── Initial load from server ───────────────────────────────────────
    useEffect(() => {
        if (!shouldSync || initialLoadDoneRef.current) return;
        initialLoadDoneRef.current = true;

        const loadFromServer = async () => {
            try {
                const serverData = await api.getRO(user.username);
                if (!serverData || !serverData.favorites) return;

                const decoded = decodeROFromServer(serverData.favorites);
                if (!decoded) return;

                // Compare with local data
                const localTaggedBands = state.taggedBands;
                const serverTaggedBands = decoded.taggedBands;

                const localHasData = Object.keys(localTaggedBands).length > 0;
                const serverHasData = Object.keys(serverTaggedBands).length > 0;

                if (localHasData && serverHasData && toComparable(localTaggedBands) !== toComparable(serverTaggedBands)) {
                    // Conflict: both have data but they differ
                    setConflictData({
                        server: {
                            taggedBands: serverTaggedBands,
                            customEvents: decoded.customEvents,
                            bandCount: Object.keys(serverTaggedBands).length,
                            updatedAt: serverData.updated_at
                        },
                        local: {
                            taggedBands: localTaggedBands,
                            customEvents: customEventsForSync,
                            bandCount: Object.keys(localTaggedBands).length
                        }
                    });
                } else if (serverHasData && !localHasData) {
                    // Server has data, local is empty → use server
                    setState(prev => ({
                        ...prev,
                        taggedBands: serverTaggedBands
                    }));
                }
                // If local has data and server doesn't, we keep local (will auto-save)
                // If both are identical, nothing to do

                // Store the encoded value to avoid re-saving what we just loaded
                lastSavedEncodedRef.current = serverData.favorites;

                // Load contacts from server
                if (serverData.contacts && Array.isArray(serverData.contacts) && serverData.contacts.length > 0) {
                    const decodedContacts = decodeContacts(serverData.contacts);
                    if (decodedContacts.length > 0) {
                        setServerContacts(decodedContacts);
                    }
                }

            } catch (err) {
                if (err.status !== 404) {
                    console.warn('Failed to load RO from server:', err.message);
                }
                // 404 = user has no server data yet, that's fine
            }
        };

        loadFromServer();
    }, [shouldSync, user]);

    // ─── Autosave to server (debounced) ─────────────────────────────────
    useEffect(() => {
        if (!shouldSync) return;
        if (!initialLoadDoneRef.current) return; // Don't save before initial load

        // Clear previous timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const encoded = encodeROForServer(state.taggedBands, customEventsForSync);

                // Skip if nothing changed since last save
                if (encoded === lastSavedEncodedRef.current) return;

                setSaveStatus('saving');

                await api.saveRO(user.username, {
                    avatar_url: user.avatar_url || null,
                    favorites: encoded,
                    contacts: encodeContacts(contactsForSync),
                    community_opt_in: consentChoice === 'full',
                    favorites_count: Object.keys(state.taggedBands).length,
                    current_favorites_count: Object.keys(state.taggedBands).filter(id => Number(id) >= 26000).length
                });

                lastSavedEncodedRef.current = encoded;
                setSaveStatus('saved');

                // Clear "saved" status after 3 seconds
                if (savedFadeTimeoutRef.current) clearTimeout(savedFadeTimeoutRef.current);
                savedFadeTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000);

            } catch (err) {
                console.error('Autosave failed:', err);
                setSaveStatus('error');
            }
        }, AUTOSAVE_DELAY);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [state.taggedBands, customEventsForSync, contactsForSync, shouldSync, user, consentChoice]);

    // ─── Resolve conflict ───────────────────────────────────────────────
    const resolveConflict = useCallback((choice) => {
        if (!conflictData) return;

        if (choice === 'server') {
            setState(prev => ({
                ...prev,
                taggedBands: conflictData.server.taggedBands
            }));
            // customEvents are managed by App.jsx, emit an event or callback
        } else {
            // 'local' — keep current state, it will auto-save to server
            lastSavedEncodedRef.current = null; // Force a re-save
        }

        setConflictData(null);
    }, [conflictData]);

    // ─── Existing state management functions ────────────────────────────

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
            user,
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
            clearAllFavorites,
            // Server sync
            saveStatus,
            conflictData,
            resolveConflict,
            consentChoice,
            setConsentChoice,
            setCustomEventsForSync,
            setContactsForSync,
            serverContacts
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
