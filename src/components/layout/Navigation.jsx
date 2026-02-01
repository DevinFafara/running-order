import React from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { DAYS } from '../../constants';

const Navigation = () => {
    const { state, setDay } = useCheckedState();
    const currentDayIndex = DAYS.indexOf(state.day);

    const handleDayChange = (newIndex) => {
        if (newIndex >= 0 && newIndex < DAYS.length) {
            setDay(DAYS[newIndex]);
        }
    };

    return (
        <nav>
            {currentDayIndex > 0 && (
                <button onClick={() => handleDayChange(currentDayIndex - 1)}>
                    <i className="fa-solid fa-chevron-left"></i>
                </button>
            )}
            <h1>{state.day}</h1>
            {currentDayIndex < DAYS.length - 1 && (
                <button onClick={() => handleDayChange(currentDayIndex + 1)}>
                    <i className="fa-solid fa-chevron-right"></i>
                </button>
            )}
        </nav>
    );
};

export default Navigation;
