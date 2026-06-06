import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const MEMBER_ID_KEY = 'hf_member_id';
const GROUPS_KEY = 'hf_groups';
const CREATED_COUNT_KEY = 'hf_groups_created_count';
const POLL_INTERVAL = 30000;
const MAX_CREATED = 2;

function getOrCreateMemberId() {
    let id = localStorage.getItem(MEMBER_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(MEMBER_ID_KEY, id);
    }
    return id;
}

function loadMyGroups() {
    try { return JSON.parse(localStorage.getItem(GROUPS_KEY)) || []; }
    catch { return []; }
}

export function useGroups(username = null) {
    const [memberId] = useState(getOrCreateMemberId);
    const [myGroups, setMyGroups] = useState(loadMyGroups);
    const [activeGroupCode, setActiveGroupCode] = useState(null);
    const [activeGroupData, setActiveGroupData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const pollRef = useRef(null);

    useEffect(() => {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(myGroups));
    }, [myGroups]);

    const fetchGroup = useCallback(async (code) => {
        try {
            const data = await api.getGroup(code);
            setActiveGroupData(data);
        } catch (err) {
            if (err.status === 404) {
                // Groupe supprimé côté serveur — on nettoie le localStorage
                setMyGroups(prev => prev.filter(g => g.code !== code));
                setActiveGroupCode(null);
            }
        }
    }, []);

    useEffect(() => {
        if (!activeGroupCode) { setActiveGroupData(null); return; }
        fetchGroup(activeGroupCode);
        pollRef.current = setInterval(() => fetchGroup(activeGroupCode), POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [activeGroupCode, fetchGroup]);

    const createGroup = useCallback(async (name, pseudo) => {
        const count = parseInt(localStorage.getItem(CREATED_COUNT_KEY) || '0');
        if (count >= MAX_CREATED) throw new Error('Tu as déjà créé 2 groupes. Supprime-en un pour en créer un nouveau.');
        setLoading(true); setError(null);
        try {
            const result = await api.createGroup({ name, member_id: memberId, pseudo, username });
            setMyGroups(prev => [...prev, { code: result.code, name: result.name, pseudo, is_owner: true }]);
            localStorage.setItem(CREATED_COUNT_KEY, String(count + 1));
            return result.code;
        } catch (err) { setError(err.message); throw err; }
        finally { setLoading(false); }
    }, [memberId, username]);

    const joinGroup = useCallback(async (code, pseudo) => {
        setLoading(true); setError(null);
        const upperCode = code.toUpperCase();
        try {
            const result = await api.joinGroup(upperCode, { member_id: memberId, pseudo, username });
            setMyGroups(prev => {
                if (prev.some(g => g.code === upperCode)) return prev;
                return [...prev, { code: upperCode, name: result.name, pseudo, is_owner: false }];
            });
            return upperCode;
        } catch (err) { setError(err.message); throw err; }
        finally { setLoading(false); }
    }, [memberId, username]);

    const leaveGroup = useCallback(async (code) => {
        await api.leaveGroup(code, memberId);
        setMyGroups(prev => prev.filter(g => g.code !== code));
        if (activeGroupCode === code) setActiveGroupCode(null);
    }, [memberId, activeGroupCode]);

    const deleteGroup = useCallback(async (code) => {
        await api.deleteGroup(code, memberId);
        setMyGroups(prev => prev.filter(g => g.code !== code));
        const count = parseInt(localStorage.getItem(CREATED_COUNT_KEY) || '0');
        localStorage.setItem(CREATED_COUNT_KEY, String(Math.max(0, count - 1)));
        if (activeGroupCode === code) setActiveGroupCode(null);
    }, [memberId, activeGroupCode]);

    const updatePosition = useCallback(async (position) => {
        await api.updatePosition(memberId, position);
        if (activeGroupCode) fetchGroup(activeGroupCode);
    }, [memberId, activeGroupCode, fetchGroup]);

    return {
        memberId,
        myGroups,
        activeGroupCode,
        setActiveGroupCode,
        activeGroupData,
        loading,
        error,
        setError,
        createGroup,
        joinGroup,
        leaveGroup,
        deleteGroup,
        updatePosition,
    };
}
