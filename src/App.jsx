import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { DAYS } from './constants';
import { CheckedStateProvider, useCheckedState } from './context/CheckedStateContext';
import { useLineup } from './hooks/useLineup';
import HeaderBar from './components/layout/HeaderBar';
import Navigation from './components/layout/Navigation';
import DayView from './components/views/DayView';
import WeeklyView from './components/views/WeeklyView';
import GroupCard from './components/common/GroupCard';
import './styles/App.css';

function AppContent() {
  const { data: groups, sideStagesData, loading, error } = useLineup();
  const { state, setDay } = useCheckedState();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'

  // SWIPE LOGIC
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // Next Day
      if (viewMode === 'day' && !selectedGroup) {
        const currentIndex = DAYS.indexOf(state.day);
        if (currentIndex !== -1 && currentIndex < DAYS.length - 1) {
          setDay(DAYS[currentIndex + 1]);
        }
      }
    },
    onSwipedRight: () => {
      // Previous Day
      if (viewMode === 'day' && !selectedGroup) {
        const currentIndex = DAYS.indexOf(state.day);
        if (currentIndex > 0) {
          setDay(DAYS[currentIndex - 1]);
        }
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: false
  });

  const handleGroupSelect = (group, event) => {
    if (group) {
      setSelectedGroup(group);
      if (event && !selectedGroup) {
        setPopoverPosition({ x: event.clientX + 20, y: event.clientY });
      }

      // Mobile Auto-Scroll Logic
      if (window.innerWidth <= 600) {
        setTimeout(() => {
          const element = document.getElementById(`group-${group.id}`);
          if (element) {
            // "Translate" effect: bringing the element to center of viewport
            element.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }, 350); // Wait for Card Slide-Up Animation to finish (approx 300ms)
      }

    } else {
      setSelectedGroup(null);
      setPopoverPosition(null);
    }
  };

  if (loading) return <div className="loading">Chargement du Hellfest... 🤘</div>;
  if (error) return <div className="error">Erreur : {error.message}</div>;

  const allGroups = state.sideScenes
    ? [...groups, ...sideStagesData]
    : groups;

  const currentDayGroups = allGroups.filter(group => group.DAY === state.day);

  return (
    <div className={`App ${selectedGroup ? 'group-selected' : ''}`}>
      <HeaderBar viewMode={viewMode} onViewChange={setViewMode} />

      {viewMode === 'day' && <Navigation />}

      <main className="content" {...swipeHandlers}>
        <Routes>
          <Route path="/" element={
            viewMode === 'day' ? (
              <DayView
                groups={currentDayGroups}
                selectGroup={handleGroupSelect}
                selectedGroupId={selectedGroup?.id}
                day={state.day}
              />
            ) : (
              <WeeklyView
                groups={[...groups, ...sideStagesData]} // Always pass all groups including side stages
                onGroupClick={(g) => handleGroupSelect(g, { clientX: window.innerWidth / 2 - 200, clientY: window.innerHeight / 2 - 200 })} // Mock position for now
              />
            )
          } />
        </Routes>

        {/* Modal Logic Reuse */}
        {selectedGroup && popoverPosition && (
          <GroupCard
            group={selectedGroup}
            position={popoverPosition}
            onClose={() => handleGroupSelect(null)}
            onPositionChange={setPopoverPosition}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <CheckedStateProvider>
      <Router>
        <AppContent />
      </Router>
    </CheckedStateProvider>
  );
}

export default App;
