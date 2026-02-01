import { useState, useEffect, useCallback } from 'react';
import { fetchAndParseGoogleSheetsCSV } from '../utils/parseCSVToJSON';
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

    const checkTimestampOnly = useCallback(async () => {
        try {
            const cacheBuster = Date.now();
            const url = `${GOOGLE_SHEETS_URL}&_cb=${cacheBuster}`;
            const response = await fetch(url, { cache: 'no-cache' });

            if (!response.ok) return null;

            const csvText = await response.text();
            const lines = csvText.split('\n');
            if (lines.length === 0) return null;

            const firstLine = lines[0].trim();
            // Simple parser for the first line
            const cells = firstLine.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

            if (cells[0] === 'LASTMOD' && cells[1]) {
                return cells[1];
            }
            return null;
        } catch (err) {
            console.error('Error checking timestamp:', err);
            return null;
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

    const checkForUpdates = useCallback(async () => {
        const cachedTimestamp = localStorage.getItem(TIMESTAMP_KEY);
        if (cachedTimestamp) {
            const currentTimestamp = await checkTimestampOnly();
            if (currentTimestamp && currentTimestamp !== cachedTimestamp) {
                console.log('New data detected on Google Sheets, refreshing...');
                await loadData(true);
            }
        }
    }, [checkTimestampOnly, loadData]);

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
