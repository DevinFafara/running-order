import React from 'react';
import { STAGE_CONFIG } from '../../constants';
import { EDITION } from '../../editions';
import { sortStagesByCount } from '../../utils/statsUtils';
import './StatsShareCard.css';

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/**
 * Carte de partage 1080×1350 (4:5), rendue hors écran et capturée par html2canvas.
 */
const StatsShareCard = ({ stats, nickname, stageTheme, appUrl, cardRef }) => {
    const days = Object.entries(stats.days).filter(([, data]) => data.count > 0);

    return (
        <div className="share-card" ref={cardRef}>
            <div className="share-card-header">
                <div className="share-card-edition">{EDITION.label}</div>
                <div className="share-card-title">Mon Profil</div>
                {nickname && <div className="share-card-nickname">{nickname}</div>}
            </div>

            <div className="share-card-class">{stats.weeklyPersona.title}</div>

            <div className="share-card-summary">
                <div className="share-card-count">
                    <span className="share-card-count-val">{stats.totalBands}</span>
                    <span className="share-card-count-label">{stats.totalBands > 1 ? 'groupes prévus' : 'groupe prévu'}</span>
                </div>
                <div className="share-card-rank">
                    <div className="share-card-rank-line">
                        Rang : <span className="share-card-rank-name">{stats.rank.toUpperCase()}</span>
                    </div>
                    <div className="share-card-gauge">
                        <div className="share-card-gauge-fill" style={{ width: `${stats.averageCompletion}%` }}></div>
                    </div>
                    <div className="share-card-rank-meta">Taux d'occupation : {stats.averageCompletion}%</div>
                </div>
            </div>

            <div className="share-card-days">
                {days.map(([day, data]) => {
                    const clashCount = stats.clashesExtended.filter(c => c.day === day).length;
                    return (
                        <div key={day} className="share-card-day">
                            <div className="share-card-day-header">
                                <span className="share-card-day-name">{day}</span>
                                <span className="share-card-day-meta">
                                    {plural(data.count, 'groupe')} · {clashCount > 0 ? plural(clashCount, 'conflit') : 'aucun conflit'}
                                </span>
                            </div>
                            <div className="share-card-day-title">{data.persona.title}</div>
                            <div className="share-card-day-bars">
                                <div className="share-card-stages">
                                    {sortStagesByCount(data.stages).map(stageKey => (
                                        <div
                                            key={stageKey}
                                            className="share-card-stage"
                                            style={{
                                                flex: data.stages[stageKey],
                                                backgroundColor: stageTheme[stageKey]?.themeColor || 'rgba(255,255,255,0.1)'
                                            }}
                                        >
                                            <img src={STAGE_CONFIG[stageKey].icon} alt={STAGE_CONFIG[stageKey].name} />
                                        </div>
                                    ))}
                                </div>
                                <div className="share-card-day-rate">{data.completionRate}%</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="share-card-footer">Prépare ton Hellfest : {appUrl}</div>
        </div>
    );
};

export default StatsShareCard;
