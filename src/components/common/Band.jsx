import React from 'react';
import chroma from 'chroma-js';
import { useCheckedState } from '../../context/CheckedStateContext';
import { STAGE_CONFIG, INTEREST_LEVELS, CONTEXT_TAGS } from '../../constants';
import MemberBadges from './MemberBadges';
import { toFestivalMinutes } from '../../utils/time';
import { markerStroke } from '../../utils/marker';
import { useFestivalNow } from '../../context/FestivalClockContext';

const Band = ({ group, selectGroup, selectedGroupId, onTagClick, dayStartMinutes, dayEndMinutes, halfWidth = false, side = 'left', sceneMarker = false, stageEdge = null }) => {
    const { GROUPE, SCENE, DEBUT, FIN, id } = group;
    const { state, getBandTag, getUserBandTag, getInterestColor, cycleInterest, isGuestMode, guestRo, stageTheme } = useCheckedState();
    const { isBandPast } = useFestivalNow();
    // Option « Estomper les groupes passés » (panneau Affichage, onglet Colonnes)
    const isPast = !!state.dimPastBands && isBandPast(group);

    const isSelected = selectedGroupId === id;
    const ownTag = getUserBandTag(id);   // toujours les tags réels de l'utilisateur
    const guestTag = isGuestMode ? getBandTag(id) : null; // tags de l'invité si mode invité
    const bandTag = ownTag;
    const hasInterest = !!ownTag?.interest;
    const hasContext = !!ownTag?.context;
    const isTagged = hasInterest || hasContext;

    // Parsing des heures
    if (typeof DEBUT !== 'string' || typeof FIN !== 'string') return null;

    // Module horaire unique : un horaire avant 6 h appartient à la nuit (+24 h)
    const debutMinutes = toFestivalMinutes(DEBUT);
    let finMinutes = toFestivalMinutes(FIN);
    if (finMinutes <= debutMinutes) finMinutes += 24 * 60;
    const duree = finMinutes - debutMinutes;
    const dureeConcert = duree;

    const stageConfig = STAGE_CONFIG[SCENE];
    const stageColors = stageTheme[SCENE];
    const sceneColor = stageColors?.themeColor || '#333';

    // Position verticale : 1 px = 1 min, depuis le haut de la journée affichée
    const getTop = () => (state.reverse
        ? `${debutMinutes - dayStartMinutes}px`
        : `${dayEndMinutes - finMinutes}px`);

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

    // Mise en avant des favoris (Paramètres) : étoile, marqueur sur le nom, ou projecteur
    // (les autres groupes s'estompent, dès que l'utilisateur a au moins un favori)
    const favoriteStyle = state.favoriteStyle || 'star';
    const isMarker = favoriteStyle === 'marker' && !!interestColor;
    const spotlightOn = favoriteStyle === 'spotlight'
        && Object.values(state.taggedBands || {}).some(t => t?.interest);
    // Repères de scène (vue compacte) : liseré sur le bord de la carte, carte collée au bord de colonne de sa scène
    const showEdge = !!stageEdge && state.stageEdge !== false;
    const snap = !!stageEdge && state.stageSnap !== false;
    const snapStyle = snap
        ? {
            width: halfWidth ? '48%' : '92%',
            marginLeft: 0,
            marginRight: 0,
            ...(stageEdge === 'left' ? { left: 0 } : { right: 0 }),
        }
        : null;
    const edgeColor = stageEdge ? chroma(sceneColor).darken(0.6).hex() : null;
    // Groupe passé : carte entière estompée ; favori passé : fond et texte estompés, mise en avant intacte
    const bandBg = stageColors?.bandColor || chroma(sceneColor).luminance(0.6).hex();
    const pastClass = isPast ? (interestColor ? ' band-past-fav' : ' band-past') : '';
    const favClass = interestColor
        ? ` fav-on fav-${favoriteStyle}`
        : (spotlightOn ? ' fav-dimmed' : '');

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

    const isHidden = stageConfig && state.scenes[stageConfig.slug] === false;
    return (
        <div
            id={`group-${id}`}
            className={`band-container ${sceneClass} band-${id} ${isSelected ? 'selected-group' : ''} ${isTagged ? 'compact-tagged' : ''}${favClass}${showEdge ? ` stage-edge-${stageEdge}` : ''}${snap ? ` stage-snap-${stageEdge}` : ''}${pastClass}`}
            style={{
                ...(interestColor ? { '--fav-color': interestColor } : {}),
                ...(showEdge ? { '--stage-edge': edgeColor } : {}),
                position: 'absolute',
                top: getTop(),
                height: `${dureeConcert - 1}px`,
                ...(halfWidth
                    ? { width: '46%', left: side === 'left' ? '2%' : '52%', marginLeft: 0, marginRight: 0 }
                    : {}),
                ...(snapStyle || {}),
                border: `0px solid ${sceneColor}`,
                backgroundColor: isPast && interestColor
                    ? chroma(bandBg).desaturate(1.5).alpha(0.45).css()
                    : bandBg,
                display: isHidden ? 'none' : 'flex',
            }}
            onClick={handleClick}
            onContextMenu={handleRightClick}
            onDoubleClick={handleDoubleClick}
        >
            {/* Repère de scène : les deux scènes d'un pôle ont des couleurs proches */}
            {sceneMarker && stageConfig && (
                <img
                    className="band-scene-marker"
                    src={stageConfig.icon}
                    alt={stageConfig.name}
                    title={stageConfig.name}
                    style={{ height: duree < 30 ? 12 : 16, width: duree < 30 ? 12 : 16 }}
                />
            )}
            {/* Tag indicators — étoiles pour les favoris de l'utilisateur */}
            {isTagged && (
                <div className="band-tag-container">
                    {interestColor && !isMarker && favoriteStyle !== 'spotlight' && (
                        <span
                            className="band-star"
                            style={{ color: interestColor }}
                            title={INTEREST_LEVELS[bandTag.interest]?.label}
                        >
                            ★
                        </span>
                    )}
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
            {/* Pastille invité — favoris du Running Order consulté */}
            {guestTag && (
                <div style={{ position: 'absolute', bottom: 2, right: 2 }}>
                    <MemberBadges taggers={[{ pseudo: guestRo?.username || '?', interest: guestTag.interest, context: guestTag.context }]} />
                </div>
            )}

            <div className={`compact-band-tag${duree < 30 ? ' slot-very-short' : duree < 45 ? ' slot-short' : ''}`}>
                <h4 style={{
                    fontSize: duree < 30
                        ? `clamp(5px, ${GROUPE.length > 16 ? 'calc(0.45vw + 4px)' : 'calc(0.55vw + 4px)'}, 11px)`
                        : `clamp(5px, ${GROUPE.length > 16 ? 'calc(0.6vw + 5px)' : 'calc(0.9vw + 8px)'}, 16px)`,
                }}>
                    {isMarker ? <span className="band-name-marker" style={{ backgroundImage: markerStroke(interestColor) }}>{GROUPE}</span> : GROUPE}
                </h4>
                {duree > 15 && (
                    <span style={{ fontSize: duree < 30 ? 'calc(0.4vw + 4px)' : 'calc(0.5vw + 6px)' }}>
                        {DEBUT.replace('h', ':')} - {FIN.replace('h', ':')}
                    </span>
                )}
            </div>
        </div>
    );
};

export default Band;
