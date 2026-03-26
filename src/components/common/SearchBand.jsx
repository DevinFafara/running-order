import React, { useState, useEffect, useRef } from 'react';
import './SearchBand.css';

const SearchBand = ({ groups, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                if (windowWidth < 750) setIsExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [windowWidth]);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const filtered = groups
            .filter(g => g.GROUPE.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10);

        setResults(filtered);
        setIsOpen(true);
        setActiveIndex(-1);
    }, [query, groups]);

    // Auto-focus when expanded on mobile
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            const timer = setTimeout(() => {
                inputRef.current.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    const handleSelect = (group) => {
        onSelect(group);
        setQuery('');
        setIsOpen(false);
        setIsExpanded(false);
    };

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
        if (!isExpanded) {
            setIsOpen(false);
            setQuery('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < results.length) {
                handleSelect(results[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setIsExpanded(false);
        }
    };

    const isMobile = windowWidth < 750;

    return (
        <div className={`search-band-wrapper ${isMobile ? 'mobile' : ''} ${isExpanded ? 'active' : ''}`} ref={wrapperRef}>
            {!isExpanded && isMobile ? (
                <button className="search-toggle-btn" onClick={handleToggleExpand}>
                    <i className="fa-solid fa-magnifying-glass"></i>
                </button>
            ) : (
                <div className="search-input-container">
                    <i className="fa-solid fa-magnifying-glass search-icon"></i>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Chercher un groupe..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => query.length >= 2 && setIsOpen(true)}
                    />
                    {(query || isExpanded) && (
                        <button className="clear-search" onClick={() => {
                            if (query) setQuery('');
                            else setIsExpanded(false);
                        }}>
                            <i className={`fa-solid ${query ? 'fa-xmark' : 'fa-chevron-left'}`}></i>
                        </button>
                    )}
                </div>
            )}

            {isOpen && results.length > 0 && (
                <ul className="search-results-list">
                    {results.map((group, index) => (
                        <li
                            key={group.id}
                            className={`search-result-item ${index === activeIndex ? 'active' : ''}`}
                            onClick={() => handleSelect(group)}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            <span className="result-name">{group.GROUPE}</span>
                            <span className="result-info">
                                {group.DAY} - {group.SCENE}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchBand;
