import React, { useMemo, useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useLineup } from '../../hooks/useLineup';
import { calculateStats, sortStagesByCount, RANKS } from '../../utils/statsUtils';
import { STAGE_CONFIG } from '../../constants';
import { EDITION } from '../../editions';
import html2canvas from 'html2canvas';
import StatsShareCard from './StatsShareCard';
import './StatsPanel.css';

const APP_URL = window.location.origin + import.meta.env.BASE_URL;

const readNickname = () => {
    try {
        return localStorage.getItem('myNickname') || '';
    } catch {
        return '';
    }
};

const StatsPanel = ({ onClose, username }) => {
    const { state, userState, stageTheme } = useCheckedState();
    const effectiveState = userState || state;

    const { data: groups } = useLineup();
    const [expandedDays, setExpandedDays] = useState({});
    const [gaugeHeight, setGaugeHeight] = useState(0);
    const [animatedTotal, setAnimatedTotal] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const cardRef = React.useRef(null);
    const nickname = username || readNickname();

    const stats = useMemo(() => {
        return calculateStats(groups, effectiveState.taggedBands);
    }, [groups, effectiveState.taggedBands]);

    React.useEffect(() => {
        const gaugeTimer = setTimeout(() => {
            setGaugeHeight(stats.averageCompletion);
        }, 300);

        const end = stats.totalBands;
        if (end === 0) return () => clearTimeout(gaugeTimer);

        let current = 0;
        const counterTimer = setInterval(() => {
            current += 1;
            setAnimatedTotal(current);
            if (current >= end) clearInterval(counterTimer);
        }, Math.max((1500 / end) * 0.8, 20));

        return () => {
            clearTimeout(gaugeTimer);
            clearInterval(counterTimer);
        };
    }, [stats.averageCompletion, stats.totalBands]);

    const toggleDay = (day) => {
        setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
    };

    const handleShare = async () => {
        if (!cardRef.current || isCapturing) return;

        setIsCapturing(true);
        try {
            await document.fonts.ready;
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#1a1a1a',
                scale: 1,
                useCORS: true,
                logging: false,
                // La carte est rognée par son conteneur hors champ : on la libère dans la copie capturée
                onclone: (clonedDoc) => {
                    const holder = clonedDoc.querySelector('.share-card-holder');
                    if (holder) holder.style.overflow = 'visible';
                }
            });

            const image = canvas.toDataURL('image/png');

            if (navigator.share && navigator.canShare) {
                const blob = await (await fetch(image)).blob();
                const file = new File([blob], 'my-hellfest-stats.png', { type: 'image/png' });

                const shareTitle = `🤘 Mon Profil Hellfest`;
                const shareText = `Voici mon programme pour l'édition ${EDITION.year} ! 🔥\n\n🤘 Groupes prévus : ${stats.totalBands}\n🏆 Grade : ${stats.rank}\n\nPrépare ton pèlerinage ici :\n${APP_URL}\n\n#Hellfest #HellfestRunningOrder`;

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: shareTitle,
                        text: shareText
                    });
                    return;
                }
            }

            const link = document.createElement('a');
            link.download = 'hellfest-stats.png';
            link.href = image;
            link.click();
        } catch (err) {
            console.error('Erreur lors de la capture :', err);
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <div className="stats-panel-overlay" onClick={onClose}>
            <div className="share-card-holder" aria-hidden="true">
                <StatsShareCard stats={stats} nickname={nickname} stageTheme={stageTheme} appUrl={APP_URL} cardRef={cardRef} />
            </div>
            <div className="stats-panel-container" onClick={e => e.stopPropagation()}>
                <div className="stats-panel-actions">
                    <button className="stats-share-btn" onClick={handleShare} disabled={isCapturing} title="Partager mon profil">
                        <i className={`fa-solid ${isCapturing ? 'fa-spinner fa-spin' : 'fa-share-nodes'}`}></i>
                    </button>
                    <button
                        onClick={onClose}
                        className="stats-close-btn"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <h2 className="stats-panel-title" style={{ margin: 0 }}>Mon Profil</h2>
                </div>

                <div className="stats-panel-rank-widget">

                    <div className="rank-gauge-area">
                        <div className="rank-gauge-bar-container">
                            <div
                                className="rank-gauge-bar-fill"
                                style={{ height: `${gaugeHeight}%` }}
                            ></div>
                        </div>

                        <div className="rank-gauge-labels">
                            {RANKS.map((rank, i) => {
                                const isActive = stats.averageCompletion >= rank.min;
                                const isPassed = stats.rank !== rank.label && isActive;

                                return (
                                    <div
                                        key={i}
                                        className={`rank-label ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                                        style={{ bottom: `${rank.min}%` }}
                                    >
                                        {rank.label}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="stats-panel-rank-info">
                        <div className="stats-main-counter">
                            <span className="stats-count-val">{stats.totalBands === 0 ? 0 : animatedTotal}</span>
                            <span className="stats-count-label">Groupes prévus</span>
                        </div>

                        <div className="stats-rank-display">
                            Rang : <span className="stats-rank-name">{stats.rank.toUpperCase()}</span>
                        </div>
                        {stats.weeklyPersona && (
                            <div className="stats-rank-display" style={{ fontSize: '1.2rem', marginTop: '5px' }}>
                                Classe : <span className="stats-rank-name">{stats.weeklyPersona.title}</span>
                            </div>
                        )}
                    </div>

                </div>

                <div className="stats-panel-section-title">MES STATS PAR JOUR</div>
                <div className="stats-panel-intensity-grid">
                    {Object.entries(stats.days)
                        .filter(([, data]) => data.count > 0)
                        .map(([day, data]) => {
                            const percentage = data.completionRate || 0;
                            const dayClashes = stats.clashesExtended.filter(c => c.day === day);
                            const hasClashes = dayClashes.length > 0;
                            const clashCount = dayClashes.length;

                            let colorClass = 'low';
                            let message = "Promenade de santé ☁️";

                            if (percentage >= 50 && percentage < 75) {
                                colorClass = 'medium';
                                message = "Rythme de croisière 😎";
                            } else if (percentage >= 75 && percentage < 90) {
                                colorClass = 'high';
                                message = "Grosse journée 🔥";
                            } else if (percentage >= 90) {
                                colorClass = 'critical';
                                message = "Mode Berserker ⚔️";
                            }

                            if (clashCount > 2) {
                                colorClass = 'critical';
                                if (percentage < 90) {
                                    message = "Sprint infernal 🏃";
                                }
                            }

                            const isExpanded = expandedDays[day];

                            return (
                                <div key={day} className="stats-panel-day-intensity">
                                    <div className="stats-panel-day-label">
                                        <span style={{ fontWeight: 600 }}>{day}</span>
                                        {message && <span className={`intensity-badge ${colorClass}`}>{message}</span>}
                                    </div>
                                    <div className="stats-panel-day-meta">
                                        Taux d'occupation : {Math.round(percentage)}%
                                    </div>
                                    <div className="stats-panel-progress-bar-bg">
                                        <div
                                            className={`stats-panel-progress-bar-fill ${colorClass}`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        ></div>
                                    </div>

                                    {hasClashes ? (
                                        <div className="stats-panel-day-clashes">
                                            <div
                                                className="stats-panel-clash-trigger"
                                                onClick={() => toggleDay(day)}
                                            >
                                                <span className="clash-trigger-icon">⚠️</span>
                                                <span className="clash-trigger-text">{data.count} groupes — {dayClashes.length} Conflit{dayClashes.length > 1 ? 's' : ''} (Afficher)</span>
                                                <span className={`clash-chevron ${isExpanded ? 'open' : ''}`}>▼</span>
                                            </div>

                                            {isExpanded && (
                                                <div className="stats-panel-clash-list embedded">
                                                    {dayClashes.map((clash, index) => (
                                                        <div key={index} className="stats-panel-clash-item embedded">
                                                            <div className="stats-panel-duel vertical">
                                                                {clash.bands.map(b => (
                                                                    <div key={b.id} className="clash-band-row">
                                                                        <span>{b.GROUPE}</span>
                                                                        <span className="clash-time-hint">{b.DEBUT}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <span className="stats-panel-clash-type">
                                                                {clash.level === 2 ? 'VS' : `${clash.level} way`}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="stats-panel-day-clashes no-conflict">
                                            <div className="stats-panel-clash-trigger no-conflict">
                                                <span className="clash-trigger-icon">👍</span>
                                                <span className="clash-trigger-text">{data.count} groupes — Aucun conflit</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="stats-panel-stage-logos-row">
                                        {sortStagesByCount(data.stages)
                                            .map(stageKey => {
                                                const count = data.stages[stageKey];
                                                const config = STAGE_CONFIG[stageKey];
                                                return (
                                                    <div
                                                        key={stageKey}
                                                        className="stage-logo-item"
                                                        style={{
                                                            flex: count,
                                                            backgroundColor: stageTheme[stageKey]?.themeColor || 'rgba(255,255,255,0.1)'
                                                        }}
                                                        title={`${config.name}: ${count} groupes`}
                                                    >
                                                        <img src={config.icon} alt={config.name} className="stage-logo-img" />
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    <div className="daily-rank-container">
                                        <div className="daily-rank-icon">
                                            <i className="fa-solid fa-medal"></i>
                                        </div>
                                        <div className="daily-rank-title">
                                            {data.persona.title}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

export default StatsPanel;
