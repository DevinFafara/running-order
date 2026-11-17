import React, { useState, useEffect, useRef } from 'react';

/**
 * Coque de carte flottante (GroupCard, panneau Affichage…) :
 * en-tête coloré déplaçable (desktop) ou redimensionnable au doigt (mobile, bottom sheet),
 * onglets optionnels et corps scrollable.
 *  - autoHeight : le contenu courant dicte la hauteur (mesurée et diffusée via --group-card-height)
 *  - contentKey : change quand le contenu change (re-mesure)
 */
const FloatingCard = ({
    color = '#333',
    title,
    actions = null,
    onClose,
    position,
    onPositionChange,
    tabs = null,
    activeTab,
    onTabChange,
    autoHeight = true,
    contentKey,
    children,
}) => {
    const cardRef = useRef(null);
    const positionRef = useRef(position);
    const [cardPosition, setCardPosition] = useState(position);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [measuredHeight, setMeasuredHeight] = useState(null);
    const [manualHeight, setManualHeight] = useState(null);

    // Mesure la hauteur quand le contenu dicte la taille
    useEffect(() => {
        if (autoHeight && cardRef.current) {
            requestAnimationFrame(() => {
                if (cardRef.current) {
                    const rect = cardRef.current.getBoundingClientRect();
                    setMeasuredHeight(rect.height);
                    if (!manualHeight) {
                        document.documentElement.style.setProperty('--group-card-height', `${rect.height}px`);
                    }
                }
            });
        }
    }, [autoHeight, contentKey, manualHeight]);

    useEffect(() => {
        if (manualHeight) {
            document.documentElement.style.setProperty('--group-card-height', `${manualHeight}px`);
        }
    }, [manualHeight]);

    // Garde la carte dans l'écran
    useEffect(() => {
        if (cardRef.current && !isDragging && position) {
            const rect = cardRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = position.x;
            let newY = position.y;

            if (newX + rect.width > viewportWidth) newX = viewportWidth - rect.width - 20;
            if (newX < 10) newX = 10;
            if (newY + rect.height > viewportHeight) newY = viewportHeight - rect.height - 20;
            if (newY < 60) newY = 60;

            const finalPos = { x: newX, y: newY };
            setCardPosition(finalPos);
            positionRef.current = finalPos;
        }
    }, [position]);

    // Déplacement à la souris
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('.tag-dropdown')) return;
        setIsDragging(true);
        const rect = cardRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !cardRef.current) return;
            e.preventDefault();

            const rect = cardRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = e.clientX - dragOffset.x;
            let newY = e.clientY - dragOffset.y;

            if (newX < 0) newX = 0;
            if (newX + rect.width > viewportWidth) newX = viewportWidth - rect.width;
            if (newY < 0) newY = 0;
            if (newY + rect.height > viewportHeight) newY = viewportHeight - rect.height;

            const newPos = { x: newX, y: newY };
            setCardPosition(newPos);
            positionRef.current = newPos;
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            if (onPositionChange) {
                onPositionChange(positionRef.current);
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, onPositionChange]);

    // Redimensionnement au doigt par l'en-tête (mobile)
    const touchStartRef = useRef({ y: 0, height: 0 });
    const isTouchDraggingRef = useRef(false);

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('.tag-dropdown')) return;

        const touch = e.touches[0];
        touchStartRef.current = {
            y: touch.clientY,
            height: cardRef.current.offsetHeight
        };
        isTouchDraggingRef.current = true;

        // Pas de transition pendant le geste : la carte suit le doigt
        if (cardRef.current) {
            cardRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e) => {
        if (!isTouchDraggingRef.current || !cardRef.current) return;
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
        const deltaY = touchStartRef.current.y - touch.clientY; // vers le haut = plus grand
        let newHeight = touchStartRef.current.height + deltaY;

        const maxHeight = 475;
        const minHeight = 55; // en-tête seul

        if (newHeight > maxHeight) newHeight = maxHeight;
        if (newHeight < minHeight) newHeight = minHeight;

        cardRef.current.style.setProperty('--mobile-height', `${newHeight}px`);
        document.documentElement.style.setProperty('--group-card-height', `${newHeight}px`);
    };

    const handleTouchEnd = () => {
        isTouchDraggingRef.current = false;
        if (cardRef.current) {
            cardRef.current.style.transition = '';
            const currentVar = cardRef.current.style.getPropertyValue('--mobile-height');
            if (currentVar && currentVar.endsWith('px')) {
                setManualHeight(parseFloat(currentVar));
            }
        }
    };

    useEffect(() => {
        const cardHeader = cardRef.current?.querySelector('.card-header');
        if (cardHeader) {
            cardHeader.addEventListener('touchstart', handleTouchStart, { passive: false });
            cardHeader.addEventListener('touchmove', handleTouchMove, { passive: false });
            cardHeader.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            if (cardHeader) {
                cardHeader.removeEventListener('touchstart', handleTouchStart);
                cardHeader.removeEventListener('touchmove', handleTouchMove);
                cardHeader.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, []);

    return (
        <div
            ref={cardRef}
            className="group-card"
            style={{
                left: cardPosition?.x,
                top: cardPosition?.y,
                '--scene-color': color,
                '--mobile-height': manualHeight ? `${manualHeight}px` : (autoHeight ? 'auto' : (measuredHeight ? `${measuredHeight}px` : 'auto')),
                zIndex: isDragging ? 1100 : 1000
            }}
        >
            <div
                className="card-header"
                style={{
                    backgroundColor: color,
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleMouseDown}
            >
                {/* Poignée */}
                <div
                    className="drag-handle"
                    style={{
                        position: 'absolute',
                        top: '6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '40px',
                        height: '0',
                        borderTop: '4px solid rgba(255,255,255,0.3)',
                        backgroundColor: 'transparent',
                        borderRadius: '2px',
                        cursor: 'grab',
                        zIndex: 10
                    }}
                />

                <div className="header-top">
                    <h3>{title}</h3>
                    <div className="header-actions">
                        {actions}
                        <button className="close-btn" onClick={onClose}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            </div>

            {tabs && (
                <div className="card-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            <i className={tab.icon}></i> {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="card-body">
                {children}
            </div>
        </div>
    );
};

export default FloatingCard;
