import React from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';

const FilterPanel = ({ isOpen, onClose }) => {
    const { state, toggleScene, setScenes } = useCheckedState();

    const scenesList = [
        { id: 'mainstage1', name: 'Mainstage 1', color: '#0055a5' },
        { id: 'mainstage2', name: 'Mainstage 2', color: '#a6a19b' },
        { id: 'warzone', name: 'Warzone', color: '#949b1a' },
        { id: 'valley', name: 'Valley', color: '#ce7c19' },
        { id: 'temple', name: 'Temple', color: '#93a7b0' },
        { id: 'altar', name: 'Altar', color: '#dc2829' }
    ];

    const handleSelectAll = () => {
        const allOn = Object.values(state.scenes).every(v => v);
        const newScenes = {};
        scenesList.forEach(s => newScenes[s.id] = !allOn);
        setScenes(newScenes);
    };

    if (!isOpen) return null;

    return (
        <div className="panel-overlay" onClick={onClose}>
            <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
                <div className="panel-header">
                    <h2>
                        <i className="fa-solid fa-filter"></i>
                        Filtres
                    </h2>
                    <button className="panel-close" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Section Scènes */}
                <div className="filter-section">
                    <div className="filter-section-header">
                        <h3>Scènes visibles</h3>
                        <button className="filter-toggle-all" onClick={handleSelectAll}>
                            {Object.values(state.scenes).every(v => v) ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                    </div>

                    <div className="filter-scenes-grid">
                        {scenesList.map((scene) => (
                            <label
                                key={scene.id}
                                className={`filter-scene-item ${state.scenes[scene.id] ? 'active' : ''}`}
                                style={{
                                    '--scene-color': scene.color,
                                    backgroundColor: state.scenes[scene.id] ? scene.color : 'rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={state.scenes[scene.id]}
                                    onChange={() => toggleScene(scene.id)}
                                />
                                <span className="filter-scene-name">{scene.name}</span>
                                <i className={`fa-solid ${state.scenes[scene.id] ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
