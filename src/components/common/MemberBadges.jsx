import React from 'react';

const INTEREST_COLORS = {
    must_see: '#e91e8c',
    interested: '#1e88e5',
    curious: '#43a047',
};

const MemberBadges = ({ taggers }) => {
    if (!taggers || taggers.length === 0) return null;
    const MAX_VISIBLE = 3;
    const visible = taggers.slice(0, MAX_VISIBLE);
    const extra = taggers.length - MAX_VISIBLE;
    return (
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {visible.map((t, i) => (
                <span
                    key={t.pseudo + i}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: t.interest ? (INTEREST_COLORS[t.interest] || '#888') : '#555',
                        color: 'white',
                        fontSize: '0.55rem',
                        fontWeight: 'bold',
                        flexShrink: 0,
                    }}
                    title={`${t.pseudo}${t.interest ? ` · ${t.interest}` : ''}${t.context ? ` · ${t.context}` : ''}`}
                >
                    {t.pseudo.slice(0, 2).toUpperCase()}
                </span>
            ))}
            {extra > 0 && (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#444',
                    color: '#aaa',
                    fontSize: '0.55rem',
                    flexShrink: 0,
                }}>+{extra}</span>
            )}
        </div>
    );
};

export default MemberBadges;
