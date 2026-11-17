import React, { useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { DAYS, DAY_SHORT, STAGE_CONFIG } from '../../constants';
import { EDITION } from '../../editions';
import { offsetToShow, poleIndexOfStage } from '../../utils/poleWindow';
import SearchBand from '../common/SearchBand';

const roundBtnStyle = {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
};

/** Onglets de jours : remplacent le swipe pour changer de journée (2027). */
const DayTabs = ({ currentDay, onSelect }) => (
    <div className="day-tabs" role="tablist" aria-label="Jour du festival">
        {DAYS.map(day => (
            <button
                key={day}
                role="tab"
                aria-selected={day === currentDay}
                className={`day-tab ${day === currentDay ? 'active' : ''}`}
                onClick={() => onSelect(day)}
            >
                {DAY_SHORT[day]}
            </button>
        ))}
    </div>
);

const Navigation = ({ groups, onSelectGroup, isAuthenticated = false, username = null, onOpenDisplay }) => {
    const { state, setDay, setState } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth < 600;

    const currentDayIndex = DAYS.indexOf(state.day);

    React.useEffect(() => {
        if (currentDayIndex === -1 && DAYS.length > 0) setDay(DAYS[0]);
    }, [currentDayIndex, setDay]);

    const handleSearchSelect = (group) => {
        const config = STAGE_CONFIG[group.SCENE];
        setState(prev => {
            const scenes = config && prev.scenes[config.slug] === false
                ? { ...prev.scenes, [config.slug]: true }
                : prev.scenes;
            // Le pôle du groupe doit être dans la fenêtre visible (mobile portrait)
            const poleOffset = offsetToShow(prev.poleOffset, EDITION.dayView.visiblePolesPortrait, poleIndexOfStage(group.SCENE));
            // Vue étendue : la scène du groupe devient la première colonne visible
            const sceneOffset = Math.max(0, EDITION.stages.findIndex(st => st.key === group.SCENE));
            return { ...prev, scenes, poleOffset, sceneOffset };
        });
        if (group.DAY !== state.day) setDay(group.DAY);
        setTimeout(() => { onSelectGroup(group, null); }, 150);
    };

    if (isMobile) {
        return (
            <>
                <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', minHeight: '40px', gap: '8px' }}>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                        <SearchBand groups={groups} onSelect={handleSearchSelect} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        {isAuthenticated && username && (
                            <span className="nav-user-chip" title={`Connecté en tant que ${username}`}>
                                <span className="nav-user-dot"></span>
                                {username}
                            </span>
                        )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {onOpenDisplay && (
                            <button onClick={onOpenDisplay} title="Affichage" style={roundBtnStyle}>
                                <i className="fa-solid fa-gear"></i>
                            </button>
                        )}
                    </div>
                </div>
                <nav className="day-nav" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 0 4px 0' }}>
                    <DayTabs currentDay={state.day} onSelect={setDay} />
                </nav>
            </>
        );
    }

    return (
        <nav style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
            position: 'relative',
            minHeight: '60px',
        }}>
            <div style={{ position: 'absolute', left: '20px', top: '12px' }}>
                <SearchBand groups={groups} onSelect={handleSearchSelect} />
            </div>

            <DayTabs currentDay={state.day} onSelect={setDay} />

            <div style={{ position: 'absolute', right: '25px', top: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onOpenDisplay && (
                    <button onClick={onOpenDisplay} title="Affichage" style={roundBtnStyle}>
                        <i className="fa-solid fa-gear"></i>
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
