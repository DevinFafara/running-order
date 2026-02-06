import React, { useMemo, useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useLineup } from '../../hooks/useLineup';
import { calculateStats } from '../../utils/statsUtils';
import { STAGE_CONFIG, MAIN_STAGES } from '../../constants';
import html2canvas from 'html2canvas';
import './StatsPanel.css';

const StatsPanel = ({ onClose, customEvents = [] }) => {
    const { state, userState } = useCheckedState();
    const effectiveState = userState || state;

    const { data: groups, sideStagesData } = useLineup();
    const [expandedDays, setExpandedDays] = useState({});
    const [gaugeHeight, setGaugeHeight] = useState(0);
    const [animatedTotal, setAnimatedTotal] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const panelRef = React.useRef(null);

    const allGroups = useMemo(() => {
        return effectiveState.sideScenes && sideStagesData
            ? [...groups, ...sideStagesData]
            : groups;
    }, [groups, sideStagesData, effectiveState.sideScenes]);

    const stats = useMemo(() => {
        return calculateStats(allGroups, effectiveState.taggedBands);
    }, [allGroups, effectiveState.taggedBands]);

    const hoursTotal = Math.round(stats.totalMinutes / 60);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setGaugeHeight(stats.averageCompletion);
        }, 300);

        let start = 0;
        const end = stats.totalBands;

        if (start === end) return;

        const duration = 1500;
        const incrementTime = end > 0 ? (duration / end) * 0.8 : 0;

        if (end > 0) {
            const timerCounter = setInterval(() => {
                start += 1;
                setAnimatedTotal(start);
                if (start >= end) clearInterval(timerCounter);
            }, Math.max(incrementTime, 20));

            return () => {
                clearTimeout(timer);
                clearInterval(timerCounter);
            };
        }
    }, [stats.averageCompletion, stats.totalBands]);

    const toggleDay = (day) => {
        setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
    };

    const handleShare = async () => {
        if (!panelRef.current) return;

        setIsCapturing(true);
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(panelRef.current, {
                    backgroundColor: '#1a1a1a',
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    onclone: (clonedDoc) => {
                        const clonedPanel = clonedDoc.querySelector('.stats-panel-container');
                        if (clonedPanel) {
                            clonedPanel.style.maxHeight = 'none';
                            clonedPanel.style.overflow = 'visible';
                            clonedPanel.style.borderRadius = '0';

                            const counterVal = clonedPanel.querySelector('.stats-count-val');
                            if (counterVal) counterVal.innerText = stats.totalBands;

                            const gaugeFill = clonedPanel.querySelector('.rank-gauge-bar-fill');
                            if (gaugeFill) gaugeFill.style.height = `${stats.averageCompletion}%`;
                        }
                    }
                });

                const image = canvas.toDataURL('image/png');

                if (navigator.share && navigator.canShare) {
                    const blob = await (await fetch(image)).blob();
                    const file = new File([blob], 'my-hellfest-stats.png', { type: 'image/png' });

                    const shareTitle = `🤘 Mon Profil Hellfest`;
                    const appUrl = window.location.origin;
                    const shareText = `Voici mon programme pour l'édition 2025 ! 🔥\n\n🤘 Groupes prévus : ${stats.totalBands}\n🏆 Grade : ${stats.rank}\n\nPrépare ton pèlerinage ici :\n${appUrl}\n\n#Hellfest #HellfestRunningOrder`;

                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: shareTitle,
                            text: shareText
                        });
                        setIsCapturing(false);
                        return;
                    }
                }

                const link = document.createElement('a');
                link.download = 'hellfest-stats.png';
                link.href = image;
                link.click();
            } catch (err) {
                console.error('Erreur lors de la capture :', err);
            }
            setIsCapturing(false);
        }, 100);
    };

    const RANKS = [
        { label: "Trve", bottom: "90%" },
        { label: "Hellbanger", bottom: "60%" },
        { label: "Amateur", bottom: "30%" },
        { label: "Touriste", bottom: "0%" }
    ];

    return (
        <div className={`stats-panel-overlay ${isCapturing ? 'capturing' : ''}`} onClick={onClose}>
            <div className="stats-panel-container" onClick={e => e.stopPropagation()} ref={panelRef}>
                {!isCapturing && (
                    <div className="stats-panel-actions">
                        <button className="stats-share-btn" onClick={handleShare} title="Partager mon profil">
                            <i className="fa-solid fa-share-nodes"></i>
                        </button>
                        <button
                            onClick={onClose}
                            className="stats-close-btn"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                )}

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
                                const isActive = stats.averageCompletion >= parseInt(rank.bottom);
                                const isPassed = stats.rank.toLowerCase() !== rank.label.toLowerCase() && isActive;

                                return (
                                    <div
                                        key={i}
                                        className={`rank-label ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                                        style={{ bottom: rank.bottom }}
                                    >
                                        {rank.label}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="stats-panel-rank-info">
                        <div className="stats-main-counter">
                            <span className="stats-count-val">{animatedTotal}</span>
                            <span className="stats-count-label">Groupes prévus</span>
                        </div>

                        <div className="stats-rank-display">
                            Rang : <span className="stats-rank-name">{stats.rank?.toUpperCase() || "TOURISTE"}</span>
                        </div>
                        {stats.weeklyPersona && (
                            <div className="stats-weekly-persona">
                                {stats.weeklyPersona.testTitle}
                            </div>
                        )}
                    </div>

                </div>

                <div style={{ clear: 'both' }}></div>

                <div className="stats-panel-section-title">MES STATS PAR JOUR</div>
                <div className="stats-panel-intensity-grid">
                    {Object.entries(stats.days)
                        .filter(([, data]) => data.count > 0)
                        .map(([day, data]) => {
                            const percentage = data.completionRate || 0;
                            const dayClashes = stats.clashesExtended ? stats.clashesExtended.filter(c => c.day === day) : [];
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
                                        {[...MAIN_STAGES]
                                            .filter(stageKey => (data.stages && data.stages[stageKey]) > 0)
                                            .sort((a, b) => {
                                                const countA = (data.stages && data.stages[a]) || 0;
                                                const countB = (data.stages && data.stages[b]) || 0;
                                                if (countB !== countA) return countB - countA;
                                                return MAIN_STAGES.indexOf(a) - MAIN_STAGES.indexOf(b);
                                            })
                                            .map(stageKey => {
                                                const count = data.stages[stageKey];
                                                const config = STAGE_CONFIG[stageKey];
                                                return (
                                                    <div
                                                        key={stageKey}
                                                        className="stage-logo-item"
                                                        style={{
                                                            flex: count,
                                                            backgroundColor: config.themeColor || 'rgba(255,255,255,0.1)'
                                                        }}
                                                        title={`${config.name}: ${count} groupes`}
                                                    >
                                                        <img src={config.icon} alt={config.name} className="stage-logo-img" />
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    <div className="daily-rank-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
                                        <div className="daily-rank-icon">
                                            <i className="fa-solid fa-medal"></i>
                                        </div>
                                        <div className="daily-rank-title">
                                            {data.persona?.title || "Simple Festivalier"}
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
