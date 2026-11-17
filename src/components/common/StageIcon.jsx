import React, { useEffect, useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';

// Icônes recolorées déjà calculées : `${src}|${color}` → data URL
const cache = new Map();

/**
 * Recolore une icône monochrome (dessin d'une seule couleur sur fond transparent) :
 * chaque pixel prend la couleur demandée, l'opacité (et donc l'anticrénelage) est conservée.
 */
const recolor = (src, color) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
});

/**
 * Icône de scène, à la couleur choisie par l'utilisateur (sinon l'image d'origine, au pixel près).
 * Reste un <img> : les classes CSS existantes (taille, fond blanc, object-fit…) s'appliquent telles quelles.
 */
const StageIcon = ({ stageKey, src, ...rest }) => {
    const { state } = useCheckedState();
    const color = state.stageColors?.[stageKey];
    const key = color ? `${src}|${color}` : null;
    // Sert seulement à re-rendre quand un calcul asynchrone se termine
    const [, setReady] = useState(null);

    useEffect(() => {
        if (!key || cache.has(key)) return undefined;
        let alive = true;
        recolor(src, color)
            .then((url) => { cache.set(key, url); if (alive) setReady(key); })
            .catch(() => {});
        return () => { alive = false; };
    }, [key, src, color]);

    // Pendant le calcul (ou sans couleur personnalisée) : l'icône d'origine
    return <img src={(key && cache.get(key)) || src} {...rest} />;
};

export default StageIcon;
