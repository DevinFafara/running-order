import React from 'react';
import chroma from 'chroma-js';
import { useCheckedState } from '../../context/CheckedStateContext';
import { STAGE_CONFIG, INTEREST_LEVELS, CONTEXT_TAGS } from '../../constants';

const Band = ({ group, selectGroup, selectedGroupId, onTagClick, dayStartMinutes, dayEndMinutes, halfWidth = false, side = 'left' }) => {
    const { GROUPE, SCENE, DEBUT, FIN, id } = group;
    const { state, getBandTag, getInterestColor, cycleInterest } = useCheckedState();

    const isSelected = selectedGroupId === id;
    const bandTag = getBandTag(id);
    const hasInterest = !!bandTag?.interest;
    const hasContext = !!bandTag?.context;
    const isTagged = hasInterest || hasContext;

    // Parsing des heures
    if (typeof DEBUT !== 'string' || typeof FIN !== 'string') return null;

    const debut = DEBUT.split('h');
    const fin = FIN.split('h');

    if (debut.length < 2) debut[1] = '00';
    if (fin.length < 2) fin[1] = '00';

    let dH = +debut[0];
    let fH = +fin[0];

    if (dH < 4) dH += 24;
    if (fH < 4) fH += 24;

    const debutMinutes = dH * 60 + (+debut[1]);
    const finMinutes = fH * 60 + (+fin[1]);
    const duree = finMinutes - debutMinutes;

    const dureeConcert = duree;

    const sceneColor = STAGE_CONFIG[SCENE]?.themeColor || '#333';

    // Calcul du top : positionnement vertical basé sur l'heure
    // Référence : 1px = 1 minute, 0px = heure de fin de journée
    // - Mercredi: fin à 01h (25h = 1500 min depuis minuit veille)
    // - Jeudi: fin à 02h (26h = 1560 min depuis minuit veille)
    // - Vendredi/Samedi: fin à 02h (26h = 1560 min)
    // - Dimanche: fin à 01h (25h = 1500 min)
    const getTop = () => {
        // Ajuster les heures APRÈS MINUIT (+24h) - seulement pour 00h-06h
        let adjustedFin = finMinutes;
        let adjustedDebut = debutMinutes;
        if (finMinutes < 6 * 60) adjustedFin += 24 * 60;  // 00:00-05:59 → +24h
        if (debutMinutes < 6 * 60) adjustedDebut += 24 * 60;  // 00:00-05:59 → +24h

        // Utilisation des bornes dynamiques si fournies (nouvelle logique)
        if (dayStartMinutes !== undefined && dayEndMinutes !== undefined) {
            if (state.reverse) {
                return `${adjustedDebut - dayStartMinutes}px`;
            } else {
                return `${dayEndMinutes - adjustedFin}px`;
            }
        }

        // --- ANCIENNE LOGIQUE (Fallback) ---
        const day = group.DAY;
        let endOfDayMinutes;
        let startOfDayMinutes;

        // Scènes annexes : elles peuvent commencer plus tôt que les scènes principales
        const isSideStage = ['HELLSTAGE', 'PURPLE_HOUSE', 'METAL_CORNER', 'HELLCITY_STAGE', 'LE_OFF1', 'LE_OFF2'].includes(SCENE);
        // Si sideScenes est activé, la journée s'étend jusqu'à 04h00 (28h) pour Metal Corner
        const extendedEnd = state.sideScenes ? 28 * 60 : 26 * 60;

        if (day === 'Mercredi') {
            endOfDayMinutes = 25 * 60; // 01h00 = 25h
            startOfDayMinutes = 16 * 60; // 16h00
        } else if (day === 'Jeudi') {
            endOfDayMinutes = extendedEnd; // 02h00 ou 04h00
            // Si sideScenes est activé, la grille commence à 11h pour TOUT LE MONDE
            if (state.sideScenes) {
                startOfDayMinutes = 11 * 60;
            } else {
                startOfDayMinutes = 16 * 60;
            }
        } else if (day === 'Dimanche') {
            endOfDayMinutes = 25 * 60; // 01h00 = 25h
            startOfDayMinutes = 10 * 60; // 10h00
        } else {
            // Vendredi/Samedi
            endOfDayMinutes = extendedEnd; // 02h00 ou 04h00
            startOfDayMinutes = 10 * 60; // 10h00 (même pour side stages)
        }

        if (state.reverse) {
            // Mode inversé: 10h en haut, 02h en bas
            return `${adjustedDebut - startOfDayMinutes}px`;
        } else {
            // Mode normal: 02h en haut, 10h en bas
            return `${endOfDayMinutes - adjustedFin}px`;
        }
    };

    // Classe CSS pour la couleur de fond
    const sceneClass = `band-${SCENE.replace(/\s/g, '')}`;

    // Couleur de l'étoile d'intérêt
    const getInterestColor_ = () => {
        if (!bandTag?.interest) return null;
        return getInterestColor(bandTag.interest);
    };

    const getContextDisplay = () => {
        if (!bandTag?.context) return null;
        const ctx = CONTEXT_TAGS[bandTag.context];
        if (!ctx) return null;
        return ctx.icon;
    };

    const interestColor = getInterestColor_();
    const contextIcon = getContextDisplay();

    const handleClick = (e) => {
        e.stopPropagation();
        selectGroup(group, e);
    };

    const handleRightClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onTagClick) {
            onTagClick(id, { x: e.clientX, y: e.clientY });
        }
    };

    // Double-clic pour cycle rapide des étoiles
    const handleDoubleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cycleInterest(id);
    };

    return (
        <div
            id={`group-${id}`}
            className={`band-container ${sceneClass} band-${id} ${isSelected ? 'selected-group' : ''} ${isTagged ? 'compact-tagged' : ''}`}
            style={{
                position: 'absolute',
                top: getTop(),
                height: `${dureeConcert - 1}px`,
                ...(halfWidth
                    ? { width: '46%', left: side === 'left' ? '2%' : '52%', marginLeft: 0, marginRight: 0 }
                    : {}),
                border: `0px solid ${sceneColor}`,
                backgroundColor: chroma(sceneColor).luminance(0.6).hex(),
                display: (!state.scenes[SCENE.toLowerCase().replace(' ', '')]) ? 'none' : 'flex',
            }}
            onClick={handleClick}
            onContextMenu={handleRightClick}
            onDoubleClick={handleDoubleClick}
        >
            {/* Tag indicators */}
            {isTagged && (
                <div className="band-tag-container">
                    {/* Une seule étoile colorée */}
                    {interestColor && (
                        <span
                            className="band-star"
                            style={{ color: interestColor }}
                            title={INTEREST_LEVELS[bandTag.interest]?.label}
                        >
                            ★
                        </span>
                    )}
                    {/* Icône de contexte (sans background) */}
                    {contextIcon && (
                        <span
                            className="band-context"
                            title={CONTEXT_TAGS[bandTag.context]?.label}
                        >
                            {contextIcon}
                        </span>
                    )}
                </div>
            )}

            <div className={`compact-band-tag${duree < 30 ? ' slot-very-short' : duree < 45 ? ' slot-short' : ''}`}>
                <h4 style={{
                    fontSize: `clamp(5px, ${GROUPE.length > 16 ? 'calc(0.6vw + 5px)' : 'calc(0.9vw + 8px)'}, 16px)`,
                }}>
                    {GROUPE}
                </h4>
                {duree > 15 && (
                    <span style={{ fontSize: 'calc(0.5vw + 6px)' }}>
                        {DEBUT.replace('h', ':')} - {FIN.replace('h', ':')}
                    </span>
                )}
            </div>
        </div>
    );
};

export default Band;
