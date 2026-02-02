
import React, { useMemo } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useLineup } from '../../hooks/useLineup';
import { calculateStats, getLevelTitle } from '../../utils/statsUtils';
import './StatsPanel.css';

const StatsPanel = ({ onClose }) => {
    const { state } = useCheckedState();
    const { data: groups, sideStagesData } = useLineup();

    // Merge data if needed
    const allGroups = useMemo(() => {
        return state.sideScenes && sideStagesData
            ? [...groups, ...sideStagesData]
            : groups;
    }, [groups, sideStagesData, state.sideScenes]);

    const stats = useMemo(() => {
        return calculateStats(allGroups, state.taggedBands);
    }, [allGroups, state.taggedBands]);

    // Le titre est basé sur le COMPTEUR EFFECTIF (plafonné par jour)
    const levelTitle = getLevelTitle(stats.effectiveTotal);
    const hoursTotal = Math.round(stats.totalMinutes / 60);

    return (
        <div className="stats-panel-overlay" onClick={onClose}>
            <div className="stats-panel-container" onClick={e => e.stopPropagation()}>
                <button className="stats-panel-close-btn" onClick={onClose}>×</button>

                <h2 className="stats-panel-title">My Hellfest DNA 🧬</h2>

                {/* --- CARD ID --- */}
                <div className="stats-panel-id-card">
                    <div className="stats-panel-avatar-section">
                        <div className="stats-panel-avatar-circle">
                            <span role="img" aria-label="avatar">🤘</span>
                        </div>
                        <div className="stats-panel-rank-badge">{levelTitle}</div>
                    </div>
                    <div className="stats-panel-info-section">
                        <h3 className="stats-panel-subtitle">Festivalier</h3>
                        <div className="stats-panel-main-stat">
                            <span className="stats-panel-number">{stats.totalBands}</span>
                            <span className="stats-panel-label">Concerts</span>
                        </div>
                        <div className="stats-panel-sub-stat">
                            <span>(Effectif pour le grade : {stats.effectiveTotal})</span>
                        </div>
                        <div className="stats-panel-sub-stat">
                            <span>≈ {hoursTotal}h de musique</span>
                        </div>
                    </div>
                    <div className="stats-panel-class-section">
                        <span className="stats-panel-label">Classe :</span>
                        <span className="stats-panel-value">{stats.topStyle}</span>
                    </div>
                </div>

                {/* --- CLASH ALERT --- */}
                {stats.clashes.length > 0 ? (
                    <div className="stats-panel-clash-alert">
                        <div className="stats-panel-clash-header">
                            <span className="stats-panel-icon">⚠️</span>
                            <h3 className="stats-panel-warning-title">{stats.clashes.length} Dilemmes Cruels (Clashes)</h3>
                        </div>
                        <div className="stats-panel-clash-list">
                            {stats.clashes.map((clash, index) => (
                                <div key={index} className="stats-panel-clash-item">
                                    <span className="stats-panel-day">{clash.day}</span>
                                    <div className="stats-panel-duel">
                                        <span className="stats-panel-g1">{clash.band1.GROUPE}</span>
                                        <span className="stats-panel-vs">vs</span>
                                        <span className="stats-panel-g2">{clash.band2.GROUPE}</span>
                                    </div>
                                    <span className="stats-panel-time">{clash.band1.DEBUT}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="stats-panel-no-clash">
                        ✅ Aucun clash majeur détecté. Planning optimisé !
                    </div>
                )}

                {/* --- DAY INTENSITY --- */}
                <div className="stats-panel-section-title">Intensité par Jour</div>
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
