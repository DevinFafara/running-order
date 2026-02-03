import { useState, useEffect, useCallback } from 'react';
import { fetchAndParseGoogleSheetsCSV, extractTimestamp } from '../utils/parseCSVToJSON';
import { GOOGLE_SHEETS_URL } from '../constants';

const CACHE_KEY = 'lineup-data';
const TIMESTAMP_KEY = 'lineup-timestamp';
const FALLBACK_URL = '/lineup.json';
const SIDESTAGES_URL = '/lineup_sidestages.json';

export const useLineup = () => {
    const [data, setData] = useState([]);
    const [sideStagesData, setSideStagesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check for updates by comparing content, ignoring volatile timestamps (formulas)
    const checkForUpdates = useCallback(async () => {
        try {
            // We fetch the full data (since we can't efficiently partial fetch CSV anyway)
            // and compare the actual DATA content, not just the timestamp line.
            // This prevents loops when the sheet uses =NOW() in the timestamp field.

            const cacheBuster = Date.now();
            const url = `${GOOGLE_SHEETS_URL}&_cb=${cacheBuster}`;

            // Pass true to potential silent mode if implemented later
            // For now, we reuse the utility
            const result = await fetchAndParseGoogleSheetsCSV(url);

            if (!result || !result.data) return;

            const cachedDataStr = localStorage.getItem(CACHE_KEY);
            const newDataStr = JSON.stringify(result.data);

            if (cachedDataStr !== newDataStr) {
                console.log('🔄 Data content has changed (ignoring timestamp diff), refreshing...');
                // Update State
                setData(result.data);
                // Update Cache
                localStorage.setItem(CACHE_KEY, newDataStr);
                localStorage.setItem(TIMESTAMP_KEY, result.timestamp);
            } else {
                // Content is identical. Do nothing.
                // We do NOT update the timestamp in cache, to keep the "original" one.
                // debug: console.log('✓ Content unchanged.');
            }
        } catch (err) {
            console.warn('Background update check failed', err);
        }
    }, []);

    // Charger les scènes annexes depuis le fichier local
    const loadSideStages = useCallback(async () => {
        try {
            const response = await fetch(SIDESTAGES_URL);
            if (response.ok) {
                const sideData = await response.json();
                setSideStagesData(sideData);
            }
        } catch (err) {
            console.warn('Could not load side stages:', err);
            setSideStagesData([]);
        }
    }, []);

    const loadData = useCallback(async (forceRefresh = false) => {
        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            const cachedTimestamp = localStorage.getItem(TIMESTAMP_KEY);

            if (cachedData && cachedTimestamp && !forceRefresh) {
                setData(JSON.parse(cachedData));
                setLoading(false);
            } else {
                let url = GOOGLE_SHEETS_URL;
                if (forceRefresh) url += `&_cb=${Date.now()}`;

                try {
                    const result = await fetchAndParseGoogleSheetsCSV(url);
                    setData(result.data);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
                    localStorage.setItem(TIMESTAMP_KEY, result.timestamp);
                } catch (fetchErr) {
                    console.warn('Google Sheets fetch failed, falling back to local JSON', fetchErr);
                    const response = await fetch(FALLBACK_URL);
                    const localData = await response.json();
                    setData(localData);
                }
                setLoading(false);
            }
        } catch (err) {
            setError(err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Charger les deux jeux de données en parallèle
        Promise.all([loadData(), loadSideStages()]).catch(console.error);
        const intervalId = setInterval(checkForUpdates, 60000); // Check every minute
        return () => clearInterval(intervalId);
    }, [loadData, loadSideStages, checkForUpdates]);

    return {
        data,
        sideStagesData,
        loading,
        error,
        refresh: () => loadData(true)
    };
};
