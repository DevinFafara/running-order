import { useState, useEffect, useCallback } from 'react';
import { fetchAndParseGoogleSheetsCSV, extractTimestamp } from '../utils/parseCSVToJSON';
import { GOOGLE_SHEETS_URL } from '../constants';

const CACHE_KEY = 'lineup-data';
const TIMESTAMP_KEY = 'lineup-timestamp';
const FALLBACK_URL = `${import.meta.env.BASE_URL}lineup.json`;

export const useLineup = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const checkForUpdates = useCallback(async () => {
        try {
            const cacheBuster = Date.now();
            const url = `${GOOGLE_SHEETS_URL}&_cb=${cacheBuster}`;

            const result = await fetchAndParseGoogleSheetsCSV(url);

            if (!result || !result.data) return;

            const cachedDataStr = localStorage.getItem(CACHE_KEY);
            const newDataStr = JSON.stringify(result.data);

            if (cachedDataStr !== newDataStr) {
                console.log('🔄 Data content has changed, refreshing...');
                setData(result.data);
                localStorage.setItem(CACHE_KEY, newDataStr);
                localStorage.setItem(TIMESTAMP_KEY, result.timestamp);
            }
        } catch (err) {
            console.warn('Background update check failed', err);
        }
    }, []);

    const loadData = useCallback(async (forceRefresh = false) => {
        try {
            // [TEST LOCAL] — bypass Google Sheets, use local lineup.json only
            const response = await fetch(FALLBACK_URL);
            const localData = await response.json();
            setData(localData);
            setLoading(false);
        } catch (err) {
            setError(err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData().catch(console.error);
        // [TEST LOCAL] — background sync disabled
        // const intervalId = setInterval(checkForUpdates, 60000);
        // return () => clearInterval(intervalId);
    }, [loadData]);

    return {
        data,
        loading,
        error,
        refresh: () => loadData(true)
    };
};
