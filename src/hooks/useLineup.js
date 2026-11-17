import { useState, useEffect, useCallback } from 'react';
import { fetchAndParseGoogleSheetsCSV } from '../utils/parseCSVToJSON';
import { GOOGLE_SHEETS_URL } from '../constants';
import { EDITION, isCurrentEditionId } from '../editions';

// Cache lié à l'édition : la programmation d'une année n'est jamais servie l'année suivante
const CACHE_KEY = `lineup-data-${EDITION.year}`;
const TIMESTAMP_KEY = `lineup-timestamp-${EDITION.year}`;
const LOCAL_URL = `${import.meta.env.BASE_URL}${EDITION.lineup.localFile}`;

// Lignes vides, incomplètes ou d'une autre édition ignorées (le Sheet peut contenir plusieurs éditions)
const cleanRows = (rows) => (rows || []).filter(r =>
    r && r.id && r.GROUPE && r.SCENE && r.DAY && isCurrentEditionId(r.id)
);

const fetchLocal = async () => {
    const response = await fetch(LOCAL_URL);
    return cleanRows(await response.json());
};

export const useLineup = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const checkForUpdates = useCallback(async () => {
        if (!GOOGLE_SHEETS_URL) return;
        try {
            const result = await fetchAndParseGoogleSheetsCSV(`${GOOGLE_SHEETS_URL}&_cb=${Date.now()}`);
            if (!result || !result.data) return;
            const fresh = cleanRows(result.data);
            const newDataStr = JSON.stringify(fresh);
            if (localStorage.getItem(CACHE_KEY) !== newDataStr) {
                setData(fresh);
                localStorage.setItem(CACHE_KEY, newDataStr);
                localStorage.setItem(TIMESTAMP_KEY, result.timestamp);
            }
        } catch (err) {
            console.warn('Background update check failed', err);
        }
    }, []);

    const loadData = useCallback(async (forceRefresh = false) => {
        try {
            // Sans Sheet (prototype) : programmation locale uniquement
            if (!GOOGLE_SHEETS_URL) {
                setData(await fetchLocal());
                setLoading(false);
                return;
            }

            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData && !forceRefresh) {
                setData(JSON.parse(cachedData));
                setLoading(false);
                return;
            }

            try {
                const url = forceRefresh ? `${GOOGLE_SHEETS_URL}&_cb=${Date.now()}` : GOOGLE_SHEETS_URL;
                const result = await fetchAndParseGoogleSheetsCSV(url);
                const fresh = cleanRows(result.data);
                setData(fresh);
                localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
                localStorage.setItem(TIMESTAMP_KEY, result.timestamp);
            } catch (fetchErr) {
                console.warn('Google Sheets fetch failed, falling back to local JSON', fetchErr);
                setData(await fetchLocal());
            }
            setLoading(false);
        } catch (err) {
            setError(err);
            setLoading(false);
        }
    }, []);

useEffect(() => {
    loadData().catch(console.error);
    if (!GOOGLE_SHEETS_URL) return undefined;
    checkForUpdates();
    const intervalId = setInterval(checkForUpdates, 60000);
    return () => clearInterval(intervalId);
}, [loadData, checkForUpdates]);

    return {
        data,
        loading,
        error,
        refresh: () => loadData(true)
    };
};
