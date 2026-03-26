import React, { useState, useEffect, useRef } from 'react';
import './SearchBand.css';

const SearchBand = ({ groups, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const filtered = groups
            .filter(g => g.GROUPE.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10); // Limit to 10 results

        setResults(filtered);
        setIsOpen(true);
        setActiveIndex(-1);
    }, [query, groups]);

    const handleSelect = (group) => {
        onSelect(group);
        setQuery('');
        setIsOpen(false);
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
        }
    };

    return (
        <div className="search-band-wrapper" ref={wrapperRef}>
            <div className="search-input-container">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                    type="text"
                    placeholder="Chercher un groupe..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
                {query && (
                    <button className="clear-search" onClick={() => setQuery('')}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                )}
            </div>

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
