import React from 'react';
import './GroupDetails.css';

const GroupDetails = ({ group, onClose }) => {
    if (!group) return null;

    const sceneColors = {
        'MAINSTAGE 1': '#9eaad3',
        'MAINSTAGE 2': '#d4d2cf',
        'WARZONE': '#cecb93',
        'VALLEY': '#eabe97',
        'ALTAR': '#f19e9e',
        'TEMPLE': '#cbd4d8',
        'HELLSTAGE': '#a0d8b7',
        'METAL_CORNER': '#d0cfae',
        'PURPLE_HOUSE': '#d6b2e0',
    };

    return (
        <div className="group-details">
            <button className="details-close-btn" onClick={onClose}>×</button>

            <div className="group-name">
                <h3 style={{ backgroundColor: sceneColors[group.SCENE] || '#333' }}>
                    {group.GROUPE}
                </h3>
            </div>

            <div className="group-infos">
                <span className="group-scene">{group.SCENE}</span>
                <span className="group-hours">{group.DEBUT.replace('h', ':')} - {group.FIN.replace('h', ':')}</span>
            </div>

            <div className="group-bio">
                {group.DESCRIPTION || "Ceci est un superbe groupe qui passera au Hellfest ! 🤘"}
            </div>

            {/* Add Appreciation / Notes section here later if needed */}
        </div>
    );
};

export default GroupDetails;
