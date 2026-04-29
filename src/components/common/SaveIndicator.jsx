import React, { useEffect, useState } from 'react';

/**
 * SaveIndicator — Discreet save status indicator (bottom-right corner).
 * Shows saving/saved/error states for server sync.
 */
const SaveIndicator = ({ status }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (status === 'saving' || status === 'error') {
            setVisible(true);
        } else if (status === 'saved') {
            setVisible(true);
            // Will fade out via the parent setting status back to 'idle'
        } else {
            // idle — fade out
            const timeout = setTimeout(() => setVisible(false), 300);
            return () => clearTimeout(timeout);
        }
    }, [status]);

    if (!visible && status === 'idle') return null;

    const configs = {
        saving: {
            icon: 'fa-solid fa-spinner fa-spin',
            text: 'Sauvegarde...',
            color: '#FFD700',
            bg: 'rgba(255, 215, 0, 0.1)',
            border: 'rgba(255, 215, 0, 0.3)'
        },
        saved: {
            icon: 'fa-solid fa-check',
            text: 'Sauvegardé',
            color: '#4CAF50',
            bg: 'rgba(76, 175, 80, 0.1)',
            border: 'rgba(76, 175, 80, 0.3)'
        },
        error: {
            icon: 'fa-solid fa-triangle-exclamation',
            text: 'Sauvegarde impossible',
            color: '#ff6b6b',
            bg: 'rgba(255, 107, 107, 0.1)',
            border: 'rgba(255, 107, 107, 0.3)'
        }
    };

    const config = configs[status];
    if (!config) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '15px',
            right: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: config.bg,
            border: `1px solid ${config.border}`,
            color: config.color,
            fontSize: '0.8rem',
            fontWeight: 500,
            zIndex: 900,
            transition: 'opacity 0.3s, transform 0.3s',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)'
        }}>
            <i className={config.icon} style={{ fontSize: '0.85rem' }}></i>
            <span>{config.text}</span>
        </div>
    );
};

export default SaveIndicator;
