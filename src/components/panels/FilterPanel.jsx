import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { SIDE_STAGES } from '../../constants';
import { EDITION } from '../../editions';

const FilterPanel = ({ isOpen, onClose }) => {
    const { state, toggleScene, setScenes, setState, stageTheme } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Scènes de l'édition, dans l'ordre des pôles (2 par ligne = 1 pôle par ligne)
    const toItem = (st) => ({ id: st.slug, name: st.name, color: stageTheme[st.key]?.themeColor ?? st.color });
    const mainScenes = EDITION.stages.map(toItem);
    const sideScenesList = EDITION.stages.filter(st => SIDE_STAGES.includes(st.key)).map(toItem);
    const hasSideStages = SIDE_STAGES.length > 0;

    const isSmallScreen = windowWidth < 1200;

    let scenesList;
    if (hasSideStages && state.sideScenes) {
        scenesList = isSmallScreen ? sideScenesList : [...mainScenes, ...sideScenesList];
    } else {
        scenesList = mainScenes;
    }

    const handleSelectAll = () => {
        // Vérifier si toutes les scènes AJOUTÉES sont cochées
        const allOn = scenesList.every(s => state.scenes[s.id] !== false);
        const newScenes = { ...state.scenes };
        scenesList.forEach(s => newScenes[s.id] = !allOn);
        setScenes(newScenes);
    };

    if (!isOpen) return null;

    return (
        <div className="panel-overlay" onClick={onClose}>
            <div className="filter-panel" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                <div className="panel-header">
                    <h2 style={{ fontFamily: 'Metal Mania', letterSpacing: '2px' }}>
                        <i className="fa-solid fa-filter"></i>
                        Filtres
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            background: 'transparent',
                            border: 'none',
                            color: '#666',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            padding: '5px'
                        }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="filter-section">

                    {/* Toggle global Scènes Annexes — masqué sur mobile (accessible via bouton nav) */}
                    {hasSideStages && !isSmallScreen && (
                        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <label className="settings-option">
                                <div className="settings-option-info">
                                    <i className="fa-solid fa-tent"></i>
                                    <div>
                                        <span className="settings-option-title">Activer Scènes Annexes</span>
                                        <span className="settings-option-desc">Hellstage, Hellcity, Purple House, Metal Corner, Le Off</span>
                                    </div>
                                </div>
                                <div className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={state.sideScenes || false}
                                        onChange={() => setState(prev => ({ ...prev, sideScenes: !prev.sideScenes }))}
                                    />
                                    <span className="toggle-slider"></span>
                                </div>
                            </label>
                        </div>
                    )}

                    <div className="filter-section-header">
                        <h3>Scènes visibles</h3>
                        <button className="filter-toggle-all" onClick={handleSelectAll}>
                            {scenesList.every(s => state.scenes[s.id] !== false) ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                    </div>

                    <div className="filter-scenes-grid">
                        {scenesList.map((scene) => (
                            <label
                                key={scene.id}
                                className={`filter-scene-item ${state.scenes[scene.id] !== false ? 'active' : ''}`}
                                style={{
                                    '--scene-color': scene.color,
                                    backgroundColor: state.scenes[scene.id] !== false ? scene.color : 'rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={state.scenes[scene.id] !== false}
                                    onChange={() => toggleScene(scene.id)}
                                />
                                <span className="filter-scene-name">{scene.name}</span>
                                <i className={`fa-solid ${state.scenes[scene.id] !== false ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
