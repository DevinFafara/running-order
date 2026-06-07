import React, { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { DAYS } from './constants';
import { CheckedStateProvider, useCheckedState } from './context/CheckedStateContext';
import { useLineup } from './hooks/useLineup';
import { useAuth } from './hooks/useAuth';
import HeaderBar from './components/layout/HeaderBar';
import { usePWA } from './hooks/usePWA';
import Navigation from './components/layout/Navigation';
import DayView from './components/views/DayView';
import WeeklyView from './components/views/WeeklyView';
import MapView from './components/views/MapView';
import GroupCard from './components/common/GroupCard';
import SaveIndicator from './components/common/SaveIndicator';
import ConsentModal from './components/modals/ConsentModal';
import ConflictResolver from './components/modals/ConflictResolver';
import './styles/App.css';

import CustomEventModal from './components/modals/CustomEventModal';
import ImportModal from './components/modals/ImportModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import ContactsPanel from './components/panels/ContactsPanel';

import { parseShareData, decodeROFromServer } from './utils/sharingUtils';
import { useNotifications } from './hooks/useNotifications';
import { useGroups } from './hooks/useGroups';
import GroupsPanel from './components/panels/GroupsPanel';

function AppContent() {
  const { data: lineupGroups, loading, error } = useLineup();
  const {
    state, setDay, setState, isGuestMode, guestRo, setGuestRo,
    saveStatus, conflictData, resolveConflict,
    consentChoice, setConsentChoice, setCustomEventsForSync,
    setContactsForSync, serverContacts,
    user,
  } = useCheckedState();
  const isAuthenticated = !!user;
  const notif = useNotifications();
  const groups = useGroups(user?.username, state.taggedBands);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const { isInstallable, isInstalled, installApp, hasPrompt, platform } = usePWA();
  const [popoverPosition, setPopoverPosition] = useState(null);
  const [viewMode, setViewMode] = useState('day');
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groupRo, setGroupRo] = useState(null);
  const [mapFlyTarget, setMapFlyTarget] = useState(null);


  const [customEvents, setCustomEvents] = useState(() => {
    const saved = localStorage.getItem('customEvents');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const [editingEvent, setEditingEvent] = useState(null);

  const [importData, setImportData] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('contacts');
    return saved ? JSON.parse(saved) : [];
  });
  const [contactToOverwrite, setContactToOverwrite] = useState(null);

  // Sync customEvents to CheckedStateContext for server sync
  useEffect(() => {
    setCustomEventsForSync(customEvents);
  }, [customEvents, setCustomEventsForSync]);

  // Maintenir les refs de useNotifications à jour
  useEffect(() => {
    notif.updateData(state.taggedBands, lineupGroups || []);
  }, [state.taggedBands, lineupGroups]);

  // Synchroniser les alarmes push quand les favoris changent (même délai que l'autosave)
  useEffect(() => {
    if (!notif.enabled) return;
    const timer = setTimeout(() => notif.syncAlarms(), 1500);
    return () => clearTimeout(timer);
  }, [state.taggedBands, notif.enabled]);

  // Sync contacts to CheckedStateContext for server sync
  useEffect(() => {
    setContactsForSync(contacts);
  }, [contacts, setContactsForSync]);

  // Restore contacts from server if local is empty
  useEffect(() => {
    if (serverContacts && serverContacts.length > 0 && contacts.length === 0) {
      setContacts(serverContacts);
    }
  }, [serverContacts]);

  useEffect(() => {
    localStorage.setItem('contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('customEvents', JSON.stringify(customEvents));
  }, [customEvents]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('share');
    if (shareToken) {
      const data = parseShareData(shareToken);
      if (data) {
        setImportData(data);
        setIsImportModalOpen(true);
      }
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
  }, []);


  const handleImportReplace = (data) => {
    setState(prev => ({
      ...prev,
      taggedBands: data.bands
    }));

    setCustomEvents(data.customEvents);
    setIsImportModalOpen(false);
  };

  const handleSaveContact = (data) => {
    if (contacts.some(c => c.username === data.username)) {
      setContactToOverwrite(data);
    } else {
      saveContactDirectly(data);
      setIsImportModalOpen(false);
    }
  };

  const saveContactDirectly = (data) => {
    setContacts(prev => {
      if (prev.some(c => c.username === data.username)) {
        return prev.map(c => c.username === data.username ? { ...c, data: data, importedAt: new Date().toISOString() } : c);
      }
      const newContact = {
        id: Date.now(),
        username: data.username,
        data: data,
        importedAt: new Date().toISOString()
      };
      return [...prev, newContact];
    });
  };

  const handleConfirmOverwrite = () => {
    if (contactToOverwrite) {
      setContacts(prev => prev.map(c => c.username === contactToOverwrite.username ? { ...c, data: contactToOverwrite, importedAt: new Date().toISOString() } : c));
      setContactToOverwrite(null);
      setIsImportModalOpen(false);
    }
  };

  const handleDeleteContact = (id) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };


  const handleCheckContactFromPanel = (data, mode) => {
    if (mode === 'replace') handleImportReplace(data);
    if (mode === 'view') {
      setGuestRo(data);
      setIsImportModalOpen(false);
    }
  };

  const handleAddCustomEvent = (event) => {
    setCustomEvents(prev => {
      const index = prev.findIndex(e => e.id === event.id);
      if (index !== -1) {
        const newEvents = [...prev];
        newEvents[index] = event;
        return newEvents;
      }
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

  const handleClearCustomEvents = () => {
    setCustomEvents([]);
  };

  // ─── Group RO ─────────────────────────────────────────────────────
  const handleShowGroupRO = () => {
    if (!groups.activeGroupData) return;
    const groupMeta = groups.myGroups.find(g => g.code === groups.activeGroupCode);
    const members = groups.activeGroupData.members
      .map(m => ({
        pseudo: m.pseudo,
        member_id: m.member_id,
        taggedBands: m.favorites ? (decodeROFromServer(m.favorites)?.taggedBands || {}) : {},
      }));
    setGroupRo({ name: groupMeta?.name || groups.activeGroupCode, members });
    setViewMode('weekly');
  };

  // Effacer le RO groupe quand on quitte la vue hebdo
  React.useEffect(() => {
    if (viewMode !== 'weekly') setGroupRo(null);
  }, [viewMode]);

  const handleViewMemberRO = (member) => {
    if (!member.favorites) return;
    const decoded = decodeROFromServer(member.favorites);
    if (!decoded) return;
    setGroupRo(null);
    setGuestRo({ bands: decoded.taggedBands, username: member.pseudo, customEvents: [] });
    setViewMode('weekly');
  };

  const handleFlyToMember = (member) => {
    setMapFlyTarget(member);
    setViewMode('map');
  };

  // ─── Consent handling ─────────────────────────────────────────────
  const handleConsentChoice = (choice) => {
    setConsentChoice(choice);
  };

  // ─── Conflict resolution — also restores customEvents from server ──
  const handleResolveConflict = (choice) => {
    if (choice === 'server' && conflictData?.server?.customEvents) {
      setCustomEvents(conflictData.server.customEvents);
    }
    resolveConflict(choice);
  };

  const showConsentModal = isAuthenticated && !consentChoice;

  const swipeHandlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      if (eventData.event.target.closest('.group-card')) return;

      if (viewMode === 'day') {
        const currentIndex = DAYS.indexOf(state.day);
        if (currentIndex !== -1 && currentIndex < DAYS.length - 1) {
          setDay(DAYS[currentIndex + 1]);
        }
      }
    },
    onSwipedRight: (eventData) => {
      if (eventData.event.target.closest('.group-card')) return;

      if (viewMode === 'day') {
        const currentIndex = DAYS.indexOf(state.day);
        if (currentIndex > 0) {
          setDay(DAYS[currentIndex - 1]);
        }
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
    touchEventOptions: { passive: true }
  });

  const handleCardPositionChange = (newPos) => {
    setPopoverPosition(newPos);
  };

  const handleGroupSelect = (group, event) => {
    if (group) {
      setSelectedGroup(group);

      if (!selectedGroup && event) {
        let x = event.clientX + 20;
        let y = event.clientY;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (viewportWidth > 600) {
          if (x + 350 > viewportWidth) x = event.clientX - 370;
          if (y + 400 > viewportHeight) y = viewportHeight - 420;
          if (y < 60) y = 60;
        }

        setPopoverPosition({ x, y });
      }

      if (window.innerWidth <= 600) {
        setTimeout(() => {
          const element = document.getElementById(`group-${group.id}`);
          if (element) {
            const cardHeight = parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue('--group-card-height')
            ) || 420;
            const visibleHeight = window.innerHeight - cardHeight;
            const rect = element.getBoundingClientRect();
            const elementCenterInDoc = rect.top + window.scrollY + rect.height / 2;
            const targetScrollY = elementCenterInDoc - visibleHeight / 2;
            window.scrollTo({ top: Math.max(0, targetScrollY), behavior: 'smooth' });
          }
        }, 350);
      }

    } else {
      setSelectedGroup(null);
      setPopoverPosition(null);
    }
  };

  if (loading) return <div className="loading">Chargement du de l'application <br></br>Hellfest Running Order Planner... 🤘</div>;
  if (error) return <div className="error">Erreur : {error.message}</div>;

  const currentDayGroups = lineupGroups.filter(group => group.DAY === state.day);

  return (
    <div className={`App ${selectedGroup ? 'group-selected' : ''} view-${viewMode}`}>
      <HeaderBar
        viewMode={viewMode}
        onViewChange={setViewMode}
        onInteraction={() => setSelectedGroup(null)}
        onAddCustomEvent={() => setIsCustomModalOpen(true)}
        customEvents={isGuestMode ? (guestRo.customEvents || []) : customEvents}
        contacts={contacts}
        onSaveContact={handleSaveContact}
        onDeleteContact={handleDeleteContact}
        onCheckContact={handleCheckContactFromPanel}
        isGuestMode={isGuestMode}
        guestName={isGuestMode ? guestRo.username : null}
        onExitGuestMode={() => setGuestRo(null)}
        onClearCustomEvents={handleClearCustomEvents}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        installApp={installApp}
        hasPrompt={hasPrompt}
        platform={platform}
        isAuthenticated={isAuthenticated}
        username={user?.username}
        notif={notif}
        onOpenGroups={() => setGroupsOpen(true)}
      />

      {isGuestMode && (
        <div style={{
          backgroundColor: '#2196F3',
          color: 'white',
          padding: '10px 15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          zIndex: 90
        }}>
          <span>
            <i className="fa-solid fa-eye" style={{ marginRight: '8px' }}></i>
            Running-Order de {guestRo.username || 'Un ami'}
          </span>
          <button
            onClick={() => setGuestRo(null)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              padding: '5px 10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem'
            }}
          >
            Sortir du mode invité
          </button>
        </div>
      )}

      {viewMode === 'day' && (
        <Navigation
          groups={lineupGroups}
          onSelectGroup={handleGroupSelect}
          isAuthenticated={isAuthenticated}
          username={user?.username}
        />
      )}

      <main className="content" {...swipeHandlers}>
        <Routes>
          <Route path="/" element={
            viewMode === 'day' ? (
              <DayView
                groups={currentDayGroups}
                selectGroup={handleGroupSelect}
                selectedGroupId={selectedGroup?.id}
                day={state.day}
                customEvents={isGuestMode ? (guestRo.customEvents || []) : customEvents}
                onDeleteCustomEvent={isGuestMode ? () => { } : handleDeleteCustomEvent}
                onEditCustomEvent={isGuestMode ? () => { } : handleEditCustomEvent}
              />
            ) : viewMode === 'map' ? (
              <MapView
                groups={lineupGroups}
                onGroupSelect={(g) => {
                    const grid = document.querySelector('.map-stage-grid');
                    const gridTop = grid ? grid.getBoundingClientRect().top : window.innerHeight * 0.6;
                    handleGroupSelect(g, { clientX: window.innerWidth / 2 - 175, clientY: gridTop - 400 });
                }}
                myGroups={groups.myGroups}
                activeGroupCode={groups.activeGroupCode}
                setActiveGroupCode={groups.setActiveGroupCode}
                activeGroupData={groups.activeGroupData}
                memberId={groups.memberId}
                updatePosition={groups.updatePosition}
                flyTarget={mapFlyTarget}
                onFlyComplete={() => setMapFlyTarget(null)}
              />
            ) : (
              <WeeklyView
                groups={lineupGroups}
                onGroupClick={(g) => handleGroupSelect(g, { clientX: window.innerWidth / 2 - 200, clientY: window.innerHeight / 2 - 200 })}
                customEvents={isGuestMode ? (guestRo.customEvents || []) : customEvents}
                onEditCustomEvent={isGuestMode ? () => { } : handleEditCustomEvent}
                groupRo={groupRo}
                onExitGroupRo={() => setGroupRo(null)}
              />
            )
          } />
        </Routes>
      </main>

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

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        data={importData}
        onReplace={handleImportReplace}
        onSave={handleSaveContact}
        onView={(data) => {
          setGuestRo(data);
          setIsImportModalOpen(false);
        }}
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
              groupMembersForBand={groupRo
                ? groupRo.members
                    .filter(m => m.taggedBands?.[selectedGroup.id])
                    .map(m => ({ pseudo: m.pseudo, ...m.taggedBands[selectedGroup.id] }))
                : null
              }
            />
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={!!contactToOverwrite}
        onClose={() => setContactToOverwrite(null)}
        onConfirm={handleConfirmOverwrite}
        title="Contact existant"
        message={`Le contact "${contactToOverwrite?.username}" existe déjà. Voulez-vous mettre à jour son Running Order ?`}
        confirmText="Mettre à jour"
      />

      {/* Server sync UI */}
      <ConsentModal
        isOpen={showConsentModal}
        onChoice={handleConsentChoice}
      />

      <ConflictResolver
        conflictData={conflictData}
        onResolve={handleResolveConflict}
      />

      <GroupsPanel
        isOpen={groupsOpen}
        onClose={() => setGroupsOpen(false)}
        myGroups={groups.myGroups}
        activeGroupCode={groups.activeGroupCode}
        setActiveGroupCode={groups.setActiveGroupCode}
        activeGroupData={groups.activeGroupData}
        memberId={groups.memberId}
        loading={groups.loading}
        error={groups.error}
        setError={groups.setError}
        createGroup={groups.createGroup}
        joinGroup={groups.joinGroup}
        leaveGroup={groups.leaveGroup}
        deleteGroup={groups.deleteGroup}
        onShowOnMap={() => setViewMode('map')}
        onShowGroupRO={handleShowGroupRO}
        onViewMemberRO={handleViewMemberRO}
        onFlyToMember={handleFlyToMember}
      />

      <SaveIndicator status={saveStatus} />

    </div>
  );
}

function App() {
  const { user } = useAuth();

  return (
    <CheckedStateProvider user={user}>
      <Router>
        <AppContent />
      </Router>
    </CheckedStateProvider>
  );
}

export default App;
