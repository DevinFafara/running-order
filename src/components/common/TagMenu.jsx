import React from 'react';
import { INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS, CONTEXT_ORDER } from '../../constants';
import { useCheckedState } from '../../context/CheckedStateContext';

const TagMenu = ({ groupId, position, onClose }) => {
    const { setInterest, setContext, getBandTag, getInterestColor } = useCheckedState();
    const menuRef = React.useRef(null);

    const currentTag = getBandTag(groupId);
    const currentInterest = currentTag?.interest;
    const currentContext = currentTag?.context;

    // Fermer au clic en dehors
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        // Utiliser 'mousedown' pour être plus réactif que 'click'
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleInterestSelect = (interestId) => {
        if (currentInterest === interestId) {
            setInterest(groupId, null);
        } else {
            setInterest(groupId, interestId);
        }
    };

    const handleContextSelect = (contextId) => {
        if (currentContext === contextId) {
            setContext(groupId, null);
        } else {
            setContext(groupId, contextId);
        }
    };

    const handleClearAll = () => {
        setInterest(groupId, null);
        setContext(groupId, null);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="tag-menu"
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 2000
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="tag-menu-header">
                <span>Marquer ce groupe</span>
                {(currentInterest || currentContext) && (
                    <button className="tag-menu-clear" onClick={handleClearAll}>
                        Tout retirer
                    </button>
                )}
            </div>

            {/* Section Intérêt (étoile unique colorée) */}
            <div className="tag-menu-section">
                <div className="tag-section-title">Niveau d'intérêt</div>
                <div className="tag-menu-options interest-options">
                    {INTEREST_ORDER.map(levelId => {
                        const level = INTEREST_LEVELS[levelId];
                        const isActive = currentInterest === levelId;
                        const color = getInterestColor(levelId);

                        return (
                            <button
                                key={levelId}
                                className={`tag-menu-option interest-option ${isActive ? 'active' : ''}`}
                                onClick={() => handleInterestSelect(levelId)}
                                style={{ '--tag-color': color }}
                            >
                                <span
                                    className="interest-star-single"
                                    style={{ color: isActive ? color : '#555' }}
                                >
                                    ★
                                </span>
                                <span className="tag-label">{level.label}</span>
                                {isActive && <span className="tag-check">✓</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Section Contexte */}
            <div className="tag-menu-section">
                <div className="tag-section-title">Contexte (optionnel)</div>
                <div className="tag-menu-options context-options">
                    {CONTEXT_ORDER.map(contextId => {
                        const ctx = CONTEXT_TAGS[contextId];
                        const isActive = currentContext === contextId;

                        return (
                            <button
                                key={contextId}
                                className={`tag-menu-option context-option ${isActive ? 'active' : ''}`}
                                onClick={() => handleContextSelect(contextId)}
                            >
                                <span className="tag-icon">{ctx.icon}</span>
                                <div className="tag-info">
                                    <span className="tag-label">{ctx.label}</span>
                                    <span className="tag-desc">{ctx.description}</span>
                                </div>
                                {isActive && <span className="tag-check">✓</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TagMenu;
