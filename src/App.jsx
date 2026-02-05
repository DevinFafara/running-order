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
import ImportModal from './components/modals/ImportModal';
import ContactsPanel from './components/panels/ContactsPanel'; // New Import
import { parseShareData } from './utils/sharingUtils';

function AppContent() {
  const { data: groups, sideStagesData, loading, error } = useLineup();
  const { state, setDay, setState } = useCheckedState();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState(null); // This state is no longer used for GroupCard, but kept for now if other uses exist.
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'

  // Custom Events State
  const [customEvents, setCustomEvents] = useState(() => {
    const saved = localStorage.getItem('customEvents');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const [editingEvent, setEditingEvent] = useState(null);

  // Share/Import State
  const [importData, setImportData] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Contacts State
  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('contacts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('customEvents', JSON.stringify(customEvents));
  }, [customEvents]);

  // Check URL for Share Token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('share');
    if (shareToken) {
      const data = parseShareData(shareToken);
      if (data) {
        setImportData(data);
        setIsImportModalOpen(true);
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
  }, []);

  // Import Handlers
  const handleImportMerge = (data) => {
    // 1. Merge Bands - Handled in onMerge prop via setState
    // 2. Merge Custom Events


    // 2. Merge Custom Events
    setCustomEvents(prev => [...prev, ...data.customEvents]);

    alert(`Import réussi ! ${Object.keys(data.bands).length} groupes et ${data.customEvents.length} créneaux fusionnés.`);
    setIsImportModalOpen(false);
  };

  const handleImportReplace = (data) => {
    // 1. Replace Bands - Handled in onReplace prop via setState
    // 2. Replace Custom Events
    setCustomEvents(data.customEvents);

    alert("Import réussi ! Votre sélection a été remplacée.");
    setIsImportModalOpen(false);
  };

  const handleSaveContact = (data) => {
    // Check if already exists
    if (contacts.some(c => c.id === data.username)) { // Use username as ID or generated ID?
      if (!window.confirm("Ce contact existe déjà. Le mettre à jour ?")) return;
      setContacts(prev => prev.map(c => c.username === data.username ? { ...c, data: data } : c));
    } else {
      const newContact = {
        id: Date.now(),
        username: data.username,
        data: data
      };
      setContacts(prev => [...prev, newContact]);
    }
    setIsImportModalOpen(false);
  };

  const handleDeleteContact = (id) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // Logic to view/merge/replace FROM a contact
  // This is handled inside ContactsPanel which re-opens ImportModal or calls handlers directly.
  // Actually, ContactsPanel will re-open ImportModal in "View Mode".
  // And ImportModal will call onMerge/onReplace which are ALREADY defined here.
  // So we just need to pass these handlers if ContactsPanel needs them?
  // ContactsPanel receives `onCheckContact` which we need to support.
  // My ContactsPanel implementation used: `onCheckContact(data, mode)`.
  // Let's implement that in HeaderBar or pass handlers down.

  // Wait, I implemented ContactsPanel to *internally* use ImportModal.
  // BUT `App.jsx` handles the main "Check URL" ImportModal.
  // `ContactsPanel` defines its OWN `ImportModal`? 
  // Let's check `ContactsPanel.jsx`.
  // Yes, lines 132-150: It renders `ImportModal`.
  // And it calls `onCheckContact(data, 'merge')`.

  // So `App.jsx` needs to provide `handleCheckContactFromPanel`.
  const handleCheckContactFromPanel = ({ data, mode }) => {
    if (mode === 'merge') handleImportMerge(data);
    if (mode === 'replace') handleImportReplace(data);
  };
  // Wait, `onCheckContact` signature in `ContactsPanel`: `onCheckContact(data, 'merge')`.
  // So `handleCheckContactFromPanel` takes `(data, mode)`.

  const handleAddCustomEvent = (event) => {
    setCustomEvents(prev => {
      const index = prev.findIndex(e => e.id === event.id);
      if (index !== -1) {
        // Update
        const newEvents = [...prev];
        newEvents[index] = event;
        return newEvents;
      }
      // Create
      return [...prev, event];
    });
    setEditingEvent(null);
  };

  const handleEditCustomEvent = (event) => {
    setEditingEvent(event);
    setIsCustomModalOpen(true);
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

  const handleCardPositionChange = (newPos) => {
    setPopoverPosition(newPos);
  };

  const handleGroupSelect = (group, event) => {
    if (group) {
      setSelectedGroup(group);

      // Calculate optimized position (prevent overflow right/bottom)
      // Only set initial position if NO group was selected previously
      if (!selectedGroup && event) {
        // Default offset
        let x = event.clientX + 20;
        let y = event.clientY;

        // Simple boundary check (assuming card width ~350px, height ~400px)
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // If screen is large enough for popover behavior
        if (viewportWidth > 600) {
          if (x + 350 > viewportWidth) x = event.clientX - 370; // Show on left if too close to right edge
          if (y + 400 > viewportHeight) y = viewportHeight - 420; // Shift up if too close to bottom
          if (y < 60) y = 60; // Keep below header
        }

        setPopoverPosition({ x, y });
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
        customEvents={customEvents}
        contacts={contacts}
        onSaveContact={handleSaveContact} // Not used directly by HeaderBar but maybe needed?
        // Actually HeaderBar renders ContactsPanel. ContactsPanel handles Delete and "Check".
        // "Check" means "Applying" the contact's RO.
        // ContactsPanel calls `onCheckContact`.
        onDeleteContact={handleDeleteContact}
        onCheckContact={(data, mode) => {
          if (mode === 'merge') handleImportMerge(data);
          if (mode === 'replace') handleImportReplace(data);
        }}
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
                onEditCustomEvent={handleEditCustomEvent}
              />
            ) : (
              <WeeklyView
                groups={[...groups, ...sideStagesData]} // Always pass all groups including side stages
                onGroupClick={(g) => handleGroupSelect(g, { clientX: window.innerWidth / 2 - 200, clientY: window.innerHeight / 2 - 200 })} // Mock position for now
                customEvents={customEvents}
                onEditCustomEvent={handleEditCustomEvent}
              />
            )
          } />
        </Routes>
      </main>

      {/* Custom Event Modal */}
      <CustomEventModal
        isOpen={isCustomModalOpen}
        onClose={() => {
          setIsCustomModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleAddCustomEvent}
        onDelete={handleDeleteCustomEvent}
        defaultDay={state.day}
        eventToEdit={editingEvent}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        data={importData}
        onMerge={(data) => {
          setState(prev => {
            const newTagged = { ...prev.taggedBands };
            Object.entries(data.bands).forEach(([id, bandData]) => {
              newTagged[id] = {
                ...(newTagged[id] || {}),
                interest: bandData.interest
              };
            });
            return { ...prev, taggedBands: newTagged };
          });
          handleImportMerge(data);
        }}
        onReplace={(data) => {
          setState(prev => ({
            ...prev,
            taggedBands: data.bands
          }));
          handleImportReplace(data);
        }}
        onSave={handleSaveContact}
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
              position={popoverPosition}
              onPositionChange={handleCardPositionChange}
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
