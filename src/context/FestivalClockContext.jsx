import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { EDITION } from '../editions';
import { getFestivalDayName, dateToFestivalMinutes, bandRange } from '../utils/time';

const DAY_INDEX = Object.fromEntries(EDITION.days.map((d, i) => [d.key, i]));

const STORAGE_KEY = 'ro-sim-now';
const IS_DEV = import.meta.env.DEV;

// Simulation (dev uniquement) : { date: 'YYYY-MM-DD', minutes: minutes depuis minuit } ou null
const readSim = () => {
    if (!IS_DEV) return null;
    try {
        const sim = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return sim && typeof sim.date === 'string' && Number.isFinite(sim.minutes) ? sim : null;
    } catch {
        return null;
    }
};

const FestivalClockContext = createContext(null);

/**
 * Horloge partagée par toutes les vues : heure réelle, ou heure simulée en dev (figée, mémorisée).
 * Rafraîchie toutes les 30 s pour que les repères « maintenant » suivent la minute.
 */
export const FestivalClockProvider = ({ children }) => {
    const [sim, setSimState] = useState(readSim);
    const [realNow, setRealNow] = useState(() => new Date());

    useEffect(() => {
        if (sim) return undefined;
        const id = setInterval(() => setRealNow(new Date()), 30 * 1000);
        return () => clearInterval(id);
    }, [sim]);

    const setSim = (next) => {
        setSimState(next);
        try {
            if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            else localStorage.removeItem(STORAGE_KEY);
        } catch { /* stockage indisponible : simulation non mémorisée */ }
    };

    const value = useMemo(() => {
        let now = realNow;
        if (sim) {
            const [y, m, d] = sim.date.split('-').map(Number);
            now = new Date(y, m - 1, d, Math.floor(sim.minutes / 60), sim.minutes % 60, 0);
        }
        const festivalDay = getFestivalDayName(now);
        const festivalMinutes = dateToFestivalMinutes(now);
        // Concert terminé : jour antérieur au jour en cours, ou fin passée le jour même (hors festival : rien n'est passé)
        const isBandPast = (band) => {
            if (!festivalDay || !(band.DAY in DAY_INDEX)) return false;
            const diff = DAY_INDEX[band.DAY] - DAY_INDEX[festivalDay];
            if (diff !== 0) return diff < 0;
            if (typeof band.DEBUT !== 'string' || typeof band.FIN !== 'string') return false;
            return bandRange(band).end <= festivalMinutes;
        };
        return {
            now,                // Date (réelle ou simulée)
            isSim: !!sim,
            sim,
            setSim,
            festivalDay,        // 'Jeudi'… ou null hors festival
            festivalMinutes,
            isBandPast,
        };
    }, [sim, realNow]);

    return <FestivalClockContext.Provider value={value}>{children}</FestivalClockContext.Provider>;
};

export const useFestivalNow = () => useContext(FestivalClockContext);
