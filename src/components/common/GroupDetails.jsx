import React from 'react';
import { STAGE_CONFIG } from '../../constants';
import './GroupDetails.css';

const GroupDetails = ({ group, onClose }) => {
    if (!group) return null;

    const sceneColor = STAGE_CONFIG[group.SCENE]?.bandColor || '#333';

    return (
        <div className="group-details">
            <button className="details-close-btn" onClick={onClose}>×</button>

            <div className="group-name">
                <h3 style={{ backgroundColor: sceneColor }}>
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
