import React, { useState, useEffect, useRef } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { STAGE_CONFIG, INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS, CONTEXT_ORDER } from '../../constants';
import FloatingCard from './FloatingCard';
// Import Logos
import bandLogos from '../../data/bandLogos.json';

const GroupCard = ({ group, position, onClose, onPositionChange, groupMembersForBand = null }) => {
    const { state, setInterest, setContext, getUserBandTag, getInterestColor, updateNote, stageTheme } = useCheckedState();

    const [activeTab, setActiveTab] = useState(groupMembersForBand !== null ? 'going' : 'infos');
    const [note, setNote] = useState('');

    // Get current tag info
    const bandTag = getUserBandTag(group.id);
    const currentInterest = bandTag?.interest;
    const currentContext = bandTag?.context;

    const sceneColor = stageTheme[group.SCENE]?.themeColor || '#333';

    // Init note safely
    useEffect(() => {
        if (state?.notes?.[group.id]) {
            setNote(state.notes[group.id]);
        } else {
            setNote('');
        }
    }, [group.id, state?.notes]);

    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [openUpwards, setOpenUpwards] = useState(false);
    const tagBtnRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowTagDropdown(false);
        if (showTagDropdown) {
            document.addEventListener('click', handleClickOutside);

            // Determine if we should open upwards
            if (tagBtnRef.current) {
                const rect = tagBtnRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const dropdownHeight = 350; // Estimated height of the dropdown
                const spaceBelow = viewportHeight - rect.bottom;

                if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                    setOpenUpwards(true);
                } else {
                    setOpenUpwards(false);
                }
            }
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showTagDropdown]);

    const handleNoteChange = (e) => {
        const newNote = e.target.value;
        setNote(newNote);
        if (updateNote && group.id) {
            updateNote(group.id, newNote);
        }
    };

    // Render single star for dropdown display
    const renderSingleStar = (level, isActive) => {
        const color = getInterestColor(level);
        return (
            <span className="interest-star-single" style={{ color: isActive ? color : '#555' }}>
                ★
            </span>
        );
    };

    // Current display in header button
    const getHeaderButtonContent = () => {
        if (currentInterest) {
            const color = getInterestColor(currentInterest);
            return (
                <span className="header-star" style={{ color }}>
                    ★
                </span>
            );
        }
        if (currentContext) {
            return <span className="header-context">{CONTEXT_TAGS[currentContext].icon}</span>;
        }
        return <span className="header-star-empty">☆</span>;
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'infos':
                return (
                    <div className="tab-content fade-in">
                        {/* LOGO DISPLAY (Simplified) */}
                        {bandLogos[group.GROUPE] && (
                            <div className="group-logo-container" style={{
                                width: '100%',
                                marginBottom: '10px',
                                display: 'flex',
                                justifyContent: 'center',
                                backgroundColor: 'black',
                                // removed background and padding
                            }}>
                                <img
                                    src={`${import.meta.env.BASE_URL}${bandLogos[group.GROUPE]}`}
                                    alt={group.GROUPE}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '80px',
                                        objectFit: 'contain'
                                    }}
                                />
                            </div>
                        )}

                        {(group.SCENE || group.DEBUT) && (
                            <div className="info-row" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-tent" style={{ color: sceneColor, fontSize: '0.95em' }}></i>
                                    <span style={{ fontSize: '0.9em' }}>
                                        {STAGE_CONFIG[group.SCENE]?.name || group.SCENE}
                                    </span>
                                </div>
                                {group.DEBUT && group.FIN && (
                                    <span style={{ color: '#ccc', fontSize: '0.9em', whiteSpace: 'nowrap' }}>
                                        <i className="fa-regular fa-clock" style={{ marginRight: '5px', color: '#888', fontSize: '0.85em' }}></i>
                                        {group.DEBUT.replace('h', ':')} – {group.FIN.replace('h', ':')}
                                    </span>
                                )}
                            </div>
                        )}

                        {group.STYLE && (
                            <div className="info-row">
                                <i className="fa-solid fa-music" style={{ color: sceneColor }}></i>
                                <span>{group.STYLE}</span>
                            </div>
                        )}
                        {group.PAYS && (
                            <div className="info-row">
                                <i className="fa-solid fa-globe" style={{ color: sceneColor }}></i>
                                <span>{group.PAYS}</span>
                            </div>
                        )}
                        {group.PARTICIPATIONS && (
                            <div className="info-row">
                                <i className="fa-solid fa-fire" style={{ color: sceneColor }}></i>
                                <span>{group.PARTICIPATIONS}</span>
                            </div>
                        )}
                        {group.FFO && (
                            <div className="info-block">
                                <div className="info-label">Si vous aimez...</div>
                                <div className="info-value ffo">{group.FFO}</div>
                            </div>
                        )}
                    </div>
                );
            case 'bio':
                return (
                    <div className="tab-content fade-in scrollable">
                        <p className="bio-text">{group.Bio || "Pas de biographie disponible."}</p>
                    </div>
                );
            case 'links':
                return (
                    <div className="tab-content fade-in">
                        <div className="links-grid">
                            {/* Qobuz en premier - Partenaire officiel Hellfest */}
                            {group.QOBUZ && (
                                <a href={group.QOBUZ} target="_blank" rel="noopener noreferrer" className="link-btn qobuz">
                                    <img src={`${import.meta.env.BASE_URL}icons/qobuz_icon.png`} alt="Qobuz" className="qobuz-icon" />
                                    Qobuz
                                </a>
                            )}
                            {group.SPOTIFY && <a href={group.SPOTIFY} target="_blank" rel="noopener noreferrer" className="link-btn spotify"><i className="fa-brands fa-spotify"></i> Spotify</a>}
                            {group.DEEZER && <a href={group.DEEZER} target="_blank" rel="noopener noreferrer" className="link-btn deezer"><i className="fa-brands fa-deezer"></i> Deezer</a>}
                            {group.YOUTUBE && <a href={group.YOUTUBE} target="_blank" rel="noopener noreferrer" className="link-btn youtube"><i className="fa-brands fa-youtube"></i> YouTube</a>}
                            {group.BANDCAMP && <a href={group.BANDCAMP} target="_blank" rel="noopener noreferrer" className="link-btn bandcamp"><i className="fa-brands fa-bandcamp"></i> Bandcamp</a>}
                            {group.SETLISTFM && <a href={group.SETLISTFM} target="_blank" rel="noopener noreferrer" className="link-btn setlistfm"><i className="fa-solid fa-list-ol"></i> Setlist.fm</a>}
                            {group.FACEBOOK && <a href={group.FACEBOOK} target="_blank" rel="noopener noreferrer" className="link-btn facebook"><i className="fa-brands fa-facebook"></i> Facebook</a>}
                            {group.INSTAGRAM && <a href={group.INSTAGRAM} target="_blank" rel="noopener noreferrer" className="link-btn instagram"><i className="fa-brands fa-instagram"></i> Instagram</a>}
                            {group.SITE && <a href={group.SITE} target="_blank" rel="noopener noreferrer" className="link-btn website"><i className="fa-solid fa-globe"></i> Site Web</a>}
                        </div>
                        {!group.SPOTIFY && !group.DEEZER && !group.QOBUZ && !group.YOUTUBE && !group.BANDCAMP && !group.SETLISTFM && !group.FACEBOOK && !group.INSTAGRAM && !group.SITE && (
                            <div className="no-data">Aucun lien disponible</div>
                        )}
                    </div>
                );
            case 'notes':
                return (
                    <div className="tab-content fade-in">
                        <textarea
                            className="note-input"
                            placeholder="Vos notes sur ce groupe..."
                            value={note}
                            onChange={handleNoteChange}
                        ></textarea>
                    </div>
                );
            case 'going':
                return (
                    <div className="tab-content fade-in scrollable">
                        {groupMembersForBand && groupMembersForBand.length > 0 ? (
                            <ul className="going-members-list">
                                {groupMembersForBand.map((m, i) => (
                                    <li key={m.pseudo + i} className="going-member-item">
                                        <span className="going-member-pseudo">{m.pseudo}</span>
                                        {m.interest && (
                                            <span className="going-member-interest" style={{ color: INTEREST_LEVELS[m.interest]?.defaultColor || '#888' }}>
                                                {INTEREST_LEVELS[m.interest]?.label || m.interest}
                                            </span>
                                        )}
                                        {m.context && (
                                            <span className="going-member-context">
                                                {CONTEXT_TAGS[m.context]?.icon} {CONTEXT_TAGS[m.context]?.label || m.context}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="no-data">Aucun membre du crew ne va voir ce groupe.</div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    const tabs = [
        { id: 'infos', icon: 'fa-solid fa-circle-info', label: 'Infos' },
        { id: 'bio', icon: 'fa-solid fa-align-left', label: 'Bio' },
        { id: 'links', icon: 'fa-solid fa-link', label: 'Liens' },
        { id: 'notes', icon: 'fa-solid fa-pen', label: 'Notes' },
        ...(groupMembersForBand !== null
            ? [{ id: 'going', icon: 'fa-solid fa-users', label: <>Présents {groupMembersForBand.length > 0 && `(${groupMembersForBand.length})`}</> }]
            : []),
    ];

    return (
        <FloatingCard
            color={sceneColor}
            title={group.GROUPE}
            onClose={onClose}
            position={position}
            onPositionChange={onPositionChange}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            autoHeight={activeTab === 'infos'}
            contentKey={group.id}
            actions={
                <div className="tag-dropdown-container" style={{ position: 'relative' }}>
                    <button
                        ref={tagBtnRef}
                        className={`favorite-btn ${(currentInterest || currentContext) ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowTagDropdown(!showTagDropdown);
                        }}
                        title="Marquer ce groupe"
                    >
                        {getHeaderButtonContent()}
                    </button>

                    {/* Dropdown menu */}
                    {showTagDropdown && (
                        <div
                            className={`tag-dropdown ${openUpwards ? 'upwards' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                top: openUpwards ? 'auto' : '100%',
                                bottom: openUpwards ? '100%' : 'auto',
                                right: 0,
                                width: '200px',
                                backgroundColor: '#222',
                                border: '1px solid #444',
                                borderRadius: '8px',
                                padding: '10px',
                                boxShadow: openUpwards ? '0 -4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.5)',
                                zIndex: 2000,
                                marginTop: openUpwards ? '0' : '5px',
                                marginBottom: openUpwards ? '5px' : '0',
                                textAlign: 'left'
                            }}
                        >
                            {/* Section Intérêt */}
                            <div className="dropdown-section-title">Intérêt</div>
                            {INTEREST_ORDER.map(levelId => {
                                const level = INTEREST_LEVELS[levelId];
                                const isActive = currentInterest === levelId;
                                return (
                                    <button
                                        key={levelId}
                                        className={`tag-dropdown-item ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            setInterest(group.id, isActive ? null : levelId);
                                        }}
                                        style={{
                                            '--tag-color': getInterestColor(levelId),
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            padding: '6px',
                                            marginBottom: '4px',
                                            background: isActive ? '#333' : 'transparent',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {renderSingleStar(levelId, isActive)}
                                        <span>{level.label}</span>
                                        {isActive && <span className="tag-check">✓</span>}
                                    </button>
                                );
                            })}

                            {/* Section Contexte */}
                            <div className="dropdown-section-title" style={{ marginTop: '10px', marginBottom: '5px', fontSize: '0.85em', color: '#888' }}>Contexte</div>
                            {CONTEXT_ORDER.map(contextId => {
                                const ctx = CONTEXT_TAGS[contextId];
                                const isActive = currentContext === contextId;
                                return (
                                    <button
                                        key={contextId}
                                        className={`tag-dropdown-item ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            setContext(group.id, isActive ? null : contextId);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            padding: '6px',
                                            marginBottom: '4px',
                                            background: isActive ? '#333' : 'transparent',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <span className="tag-item-icon">{ctx.icon}</span>
                                        <span>{ctx.label}</span>
                                        {isActive && <span className="tag-check">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            }
        >
            {renderContent()}
        </FloatingCard>
    );
};

export default GroupCard;
