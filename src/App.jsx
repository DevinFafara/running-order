import React, { useState, useEffect } from 'react';
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

import CustomEventModal from './components/modals/CustomEventModal';

function AppContent() {
  const { data: groups, sideStagesData, loading, error } = useLineup();
  const { state, setDay } = useCheckedState();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState(null); // This state is no longer used for GroupCard, but kept for now if other uses exist.
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'

  // Custom Events State
  const [customEvents, setCustomEvents] = useState(() => {
    const saved = localStorage.getItem('customEvents');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('customEvents', JSON.stringify(customEvents));
  }, [customEvents]);

  const handleAddCustomEvent = (event) => {
    setCustomEvents([...customEvents, event]);
  };

  const handleDeleteCustomEvent = (id) => {
    setCustomEvents(customEvents.filter(e => e.id !== id));
  };


  // SWIPE LOGIC
  const swipeHandlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      // Ignore swipes on the GroupCard
      if (eventData.event.target.closest('.group-card')) return;

      // Next Day
      if (viewMode === 'day') {
        const currentIndex = DAYS.indexOf(state.day);
        if (currentIndex !== -1 && currentIndex < DAYS.length - 1) {
          setDay(DAYS[currentIndex + 1]);
        }
      }
    },
    onSwipedRight: (eventData) => {
      // Ignore swipes on the GroupCard
      if (eventData.event.target.closest('.group-card')) return;

      // Previous Day
      if (viewMode === 'day') {
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
      // The popoverPosition logic is no longer directly used for GroupCard rendering in the new structure
      // but keeping it here for now if it's used elsewhere or for future changes.
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
      <HeaderBar
        viewMode={viewMode}
        onViewChange={setViewMode}
        onInteraction={() => setSelectedGroup(null)}
        onAddCustomEvent={() => setIsCustomModalOpen(true)}
      />

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
                customEvents={customEvents}
                onDeleteCustomEvent={handleDeleteCustomEvent}
              />
            ) : (
              <WeeklyView
                groups={[...groups, ...sideStagesData]} // Always pass all groups including side stages
                onGroupClick={(g) => handleGroupSelect(g, { clientX: window.innerWidth / 2 - 200, clientY: window.innerHeight / 2 - 200 })} // Mock position for now
              />
            )
          } />
        </Routes>
      </main>

      {/* Custom Event Modal */}
      <CustomEventModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSave={handleAddCustomEvent}
        defaultDay={state.day}
      />

      {selectedGroup && (
        <>
          <div
            className="group-card-overlay"
            onClick={() => setSelectedGroup(null)}
          />
          <div className="group-card-container">
            <GroupCard
              group={selectedGroup}
              onClose={() => setSelectedGroup(null)}
            />
          </div>
        </>
      )}
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
