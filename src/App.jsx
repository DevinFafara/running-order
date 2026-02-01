import React, { useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { CheckedStateProvider, useCheckedState } from './context/CheckedStateContext';
import { useLineup } from './hooks/useLineup';
import HeaderBar from './components/layout/HeaderBar';
import Navigation from './components/layout/Navigation';
import DayView from './components/views/DayView';
import GroupCard from './components/common/GroupCard';
import './styles/App.css';

function AppContent() {
  const { data: groups, sideStagesData, loading, error } = useLineup();
  const { state } = useCheckedState();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState(null);

  const handleGroupSelect = (group, event) => {
    if (group) {
      // If clicking the same group, keep it open (or toggle? No, keep open to refine selection/tabs)
      // If clicking different group, switch.
      setSelectedGroup(group);
      // Only set position if the modal is not already open
      if (event && !selectedGroup) {
        setPopoverPosition({ x: event.clientX + 20, y: event.clientY });
      }
    } else {
      setSelectedGroup(null);
      setPopoverPosition(null);
    }
  };

  if (loading) return <div className="loading">Chargement du Hellfest... 🤘</div>;
  if (error) return <div className="error">Erreur : {error.message}</div>;

  // Fusionner les groupes principaux et scènes annexes si sideScenes est activé
  const allGroups = state.sideScenes
    ? [...groups, ...sideStagesData]
    : groups;

  // Filtrer les groupes par jour actuel (comme dans running-order original)
  const currentDayGroups = allGroups.filter(group => group.DAY === state.day);

  return (
    <div className="App">
      <HeaderBar />
      <Navigation />

      <main className="content">
        <Routes>
          <Route path="/" element={
            <DayView
              groups={currentDayGroups}
              selectGroup={handleGroupSelect}
              selectedGroupId={selectedGroup?.id}
              day={state.day}
            />
          } />
        </Routes>

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
