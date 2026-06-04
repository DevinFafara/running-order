import { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

// Dates absolues du festival 2026
const FESTIVAL_DATES = {
    'Mardi':    '2026-06-16',
    'Mercredi': '2026-06-17',
    'Jeudi':    '2026-06-18',
    'Vendredi': '2026-06-19',
    'Samedi':   '2026-06-20',
    'Dimanche': '2026-06-21',
};

function parseTime(timeStr) {
    const [h, m] = timeStr.replace('h', ':').split(':').map(Number);
    return [h, m];
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
    return output;
}

function computeAlarms(taggedBands, groups, notify5min, notify15min) {
    const alarms = [];
    const now = Date.now();

    for (const [bandId, tag] of Object.entries(taggedBands)) {
        if (!tag) continue;

        const group = groups.find(g => g.id === Number(bandId));
        if (!group || !FESTIVAL_DATES[group.DAY]) continue;

        const [h, m] = parseTime(group.DEBUT);
        const date = new Date(FESTIVAL_DATES[group.DAY] + 'T00:00:00');
        // Heures < 10 = après minuit = jour calendaire suivant (même règle que Band.jsx)
        if (h < 10) date.setDate(date.getDate() + 1);
        date.setHours(h, m, 0, 0);
        const concertStart = date.getTime();

        if (notify15min) {
            const notifyAt = concertStart - 15 * 60 * 1000;
            if (notifyAt > now) {
                alarms.push({
                    bandId: Number(bandId),
                    bandName: group.GROUPE,
                    day: group.DAY,
                    scene: group.SCENE,
                    debut: group.DEBUT,
                    label: '15min',
                    notifyAt: new Date(notifyAt).toISOString(),
                });
            }
        }

        if (notify5min) {
            const notifyAt = concertStart - 5 * 60 * 1000;
            if (notifyAt > now) {
                alarms.push({
                    bandId: Number(bandId),
                    bandName: group.GROUPE,
                    day: group.DAY,
                    scene: group.SCENE,
                    debut: group.DEBUT,
                    label: '5min',
                    notifyAt: new Date(notifyAt).toISOString(),
                });
            }
        }
    }

    return alarms;
}

export function useNotifications() {
    const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent);
    // iOS browser = iOS + non standalone (non installé en PWA)
    const isIOSBrowser = isIOS && !window.navigator.standalone;
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

    const [permission, setPermission] = useState(() =>
        isSupported ? Notification.permission : 'denied'
    );
    const [enabled, setEnabled] = useState(() => localStorage.getItem('notif_enabled') === 'true');
    const [notify5min, setNotify5minState] = useState(() => localStorage.getItem('notif_5min') !== 'false');
    const [notify15min, setNotify15minState] = useState(() => localStorage.getItem('notif_15min') !== 'false');

    // Refs pour accès sans re-render depuis les callbacks async
    const taggedBandsRef = useRef({});
    const groupsRef = useRef([]);
    const notify5minRef = useRef(notify5min);
    const notify15minRef = useRef(notify15min);

    const updateData = useCallback((taggedBands, groups) => {
        taggedBandsRef.current = taggedBands;
        groupsRef.current = groups;
    }, []);

    const getOrCreateSubscription = async () => {
        const registration = await navigator.serviceWorker.ready;
        let sub = await registration.pushManager.getSubscription();
        if (!sub) {
            const { publicKey } = await api.getPushVapidKey();
            sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
        }
        return sub;
    };

    const syncAlarms = useCallback(async () => {
        if (!isSupported || Notification.permission !== 'granted') return;
        try {
            const sub = await getOrCreateSubscription();
            const alarms = computeAlarms(
                taggedBandsRef.current,
                groupsRef.current,
                notify5minRef.current,
                notify15minRef.current
            );
            await api.subscribePush(sub.toJSON(), alarms, {
                notify5min: notify5minRef.current,
                notify15min: notify15minRef.current,
            });
        } catch (err) {
            console.warn('Push sync failed:', err);
        }
    }, [isSupported]);

    const enable = useCallback(async () => {
        if (!isSupported) return false;
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== 'granted') return false;
        localStorage.setItem('notif_enabled', 'true');
        setEnabled(true);
        await syncAlarms();
        return true;
    }, [isSupported, syncAlarms]);

    const disable = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            if (sub) {
                await api.unsubscribePush(sub.endpoint);
                await sub.unsubscribe();
            }
        } catch (err) {
            console.warn('Unsubscribe failed:', err);
        }
        localStorage.setItem('notif_enabled', 'false');
        setEnabled(false);
    }, []);

    const setNotify5min = useCallback(async (val) => {
        localStorage.setItem('notif_5min', String(val));
        notify5minRef.current = val;
        setNotify5minState(val);
        if (localStorage.getItem('notif_enabled') === 'true') await syncAlarms();
    }, [syncAlarms]);

    const setNotify15min = useCallback(async (val) => {
        localStorage.setItem('notif_15min', String(val));
        notify15minRef.current = val;
        setNotify15minState(val);
        if (localStorage.getItem('notif_enabled') === 'true') await syncAlarms();
    }, [syncAlarms]);

    return {
        isSupported,
        isIOSBrowser,
        permission,
        enabled,
        notify5min,
        notify15min,
        updateData,
        syncAlarms,
        enable,
        disable,
        setNotify5min,
        setNotify15min,
    };
}
