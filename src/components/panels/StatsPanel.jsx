
import React, { useMemo, useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useLineup } from '../../hooks/useLineup';
import { calculateStats, getLevelTitle } from '../../utils/statsUtils';
import './StatsPanel.css';

const StatsPanel = ({ onClose }) => {
    const { state } = useCheckedState();
    const { data: groups, sideStagesData } = useLineup();
    const [expandedDays, setExpandedDays] = useState({});
    const [gaugeHeight, setGaugeHeight] = useState(0);
    const [animatedTotal, setAnimatedTotal] = useState(0);

    // Merge data if needed
    const allGroups = useMemo(() => {
        return state.sideScenes && sideStagesData
            ? [...groups, ...sideStagesData]
            : groups;
    }, [groups, sideStagesData, state.sideScenes]);

    const stats = useMemo(() => {
        return calculateStats(allGroups, state.taggedBands);
    }, [allGroups, state.taggedBands]);

    const hoursTotal = Math.round(stats.totalMinutes / 60);

    // Animation Effect
    React.useEffect(() => {
        // Delay slighty for enter animation
        const timer = setTimeout(() => {
            setGaugeHeight(stats.averageCompletion);
        }, 300);

        // Counter Animation
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

    const RANKS = [
        { label: "Trve", bottom: "90%" },
        { label: "Hellbanger", bottom: "60%" },
        { label: "Amateur", bottom: "30%" },
        { label: "Touriste", bottom: "0%" }
    ];

    return (
        <div className="stats-panel-overlay" onClick={onClose}>
            <div className="stats-panel-container" onClick={e => e.stopPropagation()}>
                <button className="stats-panel-close-btn" onClick={onClose}>×</button>

                <h2 className="stats-panel-title">Mon Profil</h2>

                <div className="stats-panel-rank-widget">

                    {/* LEFT: GAUGE + LABELS */}
                    <div className="rank-gauge-area">
                        {/* The Actual Gauge Bar (Clipped) */}
                        <div className="rank-gauge-bar-container">
                            <div
                                className="rank-gauge-bar-fill"
                                style={{ height: `${gaugeHeight}%` }}
                            ></div>
                        </div>

                        {/* The Labels (Absolute positioned relative to area, visible) */}
                        <div className="rank-gauge-labels">
                            {RANKS.map((rank, i) => (
                                <div
                                    key={i}
                                    className={`rank-label ${stats.averageCompletion >= parseInt(rank.bottom) ? 'active' : ''}`}
                                    style={{ bottom: rank.bottom }}
                                >
                                    {rank.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: INFO & COUNTERS */}
                    <div className="stats-panel-rank-info">
                        <div className="stats-main-counter">
                            <span className="stats-count-val">{animatedTotal}</span>
                            <span className="stats-count-label">Groupes vus</span>
                        </div>

                        <div className="stats-rank-display">
                            Rang : <span className="stats-rank-name">{stats.rank?.toUpperCase() || "TOURISTE"}</span>
                        </div>

                        <div className="stats-completion-text">
                            Taux de complétion moyen : <strong>{stats.averageCompletion}%</strong>
                        </div>
                        <div className="stats-music-time">
                            <span>≈ {hoursTotal}h de musique</span>
                        </div>
                    </div>

                </div>

                <div style={{ clear: 'both' }}></div>

                {/* --- STYLE DISTRIBUTION --- */}
                <div className="stats-panel-class-section">
                    <span>Classe dominante:</span>
                    <span className="stats-panel-value">{stats.topStyle}</span>
                </div>

                {/* --- DAY INTENSITY with CLASHES --- */}
                <div className="stats-panel-section-title">Intensité & Conflits par Jour</div>
                <div className="stats-panel-intensity-grid">
                    {Object.entries(stats.days).map(([day, data]) => {
                        const percentage = data.intensity;
                        let colorClass = 'low'; // Green (< 75%)
                        let message = "Rythme confort 😎";

                        if (percentage >= 75 && percentage <= 100) {
                            colorClass = 'medium'; // Yellow
                            message = "Pensez à vous hydrater 🍺";
                        } else if (percentage > 100) {
                            colorClass = 'high'; // Red
                            message = "Gourmandise ! (Journée chargée) 😈";
                        }

                        // Filter Clashes for this day
                        const dayClashes = stats.clashesExtended ? stats.clashesExtended.filter(c => c.day === day) : [];
                        const hasClashes = dayClashes.length > 0;
                        const isExpanded = expandedDays[day];

                        return (
                            <div key={day} className="stats-panel-day-intensity">
                                <div className="stats-panel-day-label">
                                    <span>{day}</span>
                                    <span className="stats-panel-count">{data.count} groupes</span>
                                </div>
                                <div className="stats-panel-progress-bar-bg">
                                    <div
                                        className={`stats-panel-progress-bar-fill ${colorClass}`}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    ></div>
                                </div>
                                <div className={`stats-panel-warning-text ${colorClass}`}>{message}</div>

                                {hasClashes && (
                                    <div className="stats-panel-day-clashes">
                                        <div
                                            className="stats-panel-clash-trigger"
                                            onClick={() => toggleDay(day)}
                                        >
                                            <span className="clash-trigger-icon">⚠️</span>
                                            <span className="clash-trigger-text">{dayClashes.length} Conflit{dayClashes.length > 1 ? 's' : ''} (Afficher)</span>
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
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* --- STYLE DISTRIBUTION --- */}
                <div className="stats-panel-section-title">Répartition des Styles</div>
                <div className="stats-panel-style-chips">
                    {Object.entries(stats.styles)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 6)
                        .map(([style, count]) => (
                            <div key={style} className="stats-panel-style-chip">
                                <span className="stats-panel-style-name">{style}</span>
                                <span className="stats-panel-style-count">{count}</span>
                            </div>
                        ))}
                </div>

            </div>
        </div>
    );
};

export default StatsPanel;
