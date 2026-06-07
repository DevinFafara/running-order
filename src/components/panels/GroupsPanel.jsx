import React, { useState, useCallback } from 'react';
import { STAGE_CONFIG } from '../../constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

function nearestStageName(position) {
    if (!position) return null;
    const x = parseFloat(position.x);
    const y = parseFloat(position.y);
    let min = Infinity, nearest = null;
    Object.values(STAGE_CONFIG).forEach(cfg => {
        if (!cfg.mapPosition) return;
        const dx = x - parseFloat(cfg.mapPosition.left);
        const dy = y - parseFloat(cfg.mapPosition.top);
        const d = dx * dx + dy * dy;
        if (d < min) { min = d; nearest = cfg.name; }
    });
    return nearest;
}

function positionAge(updatedAt) {
    if (!updatedAt) return null;
    return Date.now() - new Date(updatedAt).getTime();
}

function formatAge(ms) {
    if (ms < 60000) return "à l'instant";
    if (ms < 3600000) return `il y a ${Math.floor(ms / 60000)} min`;
    return `il y a ${Math.floor(ms / 3600000)}h${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ updatedAt }) {
    const age = positionAge(updatedAt);
    const color = age === null || age > 7200000 ? '#555' : age > 1800000 ? '#e6a817' : '#4caf50';
    return (
        <span style={{
            display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
            backgroundColor: color, marginRight: 8, flexShrink: 0,
        }} />
    );
}

function PositionLabel({ position, updatedAt }) {
    const age = positionAge(updatedAt);
    if (age === null) return <span style={{ color: '#666', fontSize: '0.78rem' }}>Position inconnue</span>;
    if (age > 7200000) return <span style={{ color: '#666', fontSize: '0.78rem' }}>Hors ligne</span>;
    const stageName = nearestStageName(position);
    return (
        <span style={{ color: '#999', fontSize: '0.78rem' }}>
            {stageName ? `Près de ${stageName}` : 'Position connue'} · {formatAge(age)}
        </span>
    );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const S = {
    input: {
        width: '100%', backgroundColor: '#252525', border: '1px solid #3a3a3a',
        borderRadius: 8, color: '#fff', padding: '10px 12px', fontSize: '0.95rem',
        boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
    },
    btnPrimary: {
        backgroundColor: '#dc2829', color: '#fff', border: 'none', borderRadius: 8,
        padding: '10px 16px', fontSize: '0.9rem', fontWeight: 'bold',
        cursor: 'pointer', width: '100%', fontFamily: 'inherit',
    },
    btnSecondary: {
        backgroundColor: 'rgba(255,255,255,0.06)', color: '#aaa',
        border: '1px solid #333', borderRadius: 8, padding: '10px 16px',
        fontSize: '0.9rem', cursor: 'pointer', width: '100%', fontFamily: 'inherit',
    },
    btnBack: {
        background: 'none', border: 'none', color: '#888', cursor: 'pointer',
        fontSize: '1rem', padding: 0, display: 'flex', alignItems: 'center', marginRight: 4,
    },
    label: { color: '#888', fontSize: '0.78rem', display: 'block', marginBottom: 5 },
    sectionTitle: {
        color: '#666', fontSize: '0.72rem', textTransform: 'uppercase',
        letterSpacing: '0.5px', marginBottom: 10,
    },
    errorBox: {
        color: '#e57373', fontSize: '0.82rem', backgroundColor: 'rgba(220,40,41,0.1)',
        padding: '8px 12px', borderRadius: 8, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    },
};

// ── Panel wrapper (same as CommunityPanel) ────────────────────────────────────

const PanelWrapper = ({ onClose, title, children }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s',
    }} onClick={onClose}>
        <div style={{
            backgroundColor: '#1a1a1a', borderRadius: '16px', padding: '20px',
            width: '90%', maxWidth: '400px', border: '1px solid #333',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)', position: 'relative',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        }} onClick={e => e.stopPropagation()}>

            <h2 style={{
                marginTop: 0, marginBottom: '18px', color: '#FFD700',
                textAlign: 'center', fontFamily: '"Metal Mania", cursive', letterSpacing: '1px',
            }}>
                <i className="fa-solid fa-user-group" style={{ marginRight: 10, color: '#FF6B35' }} />
                Crews
            </h2>

            <button onClick={onClose} style={{
                position: 'absolute', top: 15, right: 15,
                background: 'transparent', border: 'none', color: '#666',
                fontSize: '1.2rem', cursor: 'pointer', padding: '5px',
            }}>
                <i className="fa-solid fa-xmark" />
            </button>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                {children}
            </div>
        </div>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const ConsentNotice = () => (
    <div style={{
        color: '#aaa', fontSize: '0.78rem', backgroundColor: 'rgba(255,255,255,0.04)',
        padding: '10px 12px', borderRadius: 8, border: '1px solid #2a2a2a', lineHeight: 1.5,
    }}>
        <i className="fa-solid fa-circle-info" style={{ marginRight: 6, color: '#90caf9' }} />
        Ta position et tes favoris seront visibles par les membres du groupe.
    </div>
);

const GroupsPanel = ({
    isOpen, onClose,
    myGroups, activeGroupCode, setActiveGroupCode, activeGroupData,
    memberId, loading, error, setError,
    createGroup, joinGroup, leaveGroup, deleteGroup, removeMember,
    onShowOnMap, onShowGroupRO, onViewMemberRO, onFlyToMember,
}) => {
    const [screen, setScreen] = useState('list');
    const [detailCode, setDetailCode] = useState(null);
    const [createName, setCreateName] = useState('');
    const [createPseudo, setCreatePseudo] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [joinPseudo, setJoinPseudo] = useState('');
    const [formError, setFormError] = useState(null);

    if (!isOpen) return null;

    const goToDetail = (code) => {
        setDetailCode(code);
        setActiveGroupCode(code);
        setScreen('detail');
    };

    const goToList = () => { setScreen('list'); setFormError(null); };

    const handleCreate = async () => {
        setFormError(null);
        if (!createName.trim()) return setFormError('Donne un nom au crew');
        if (!createPseudo.trim()) return setFormError('Choisis un pseudo');
        try {
            const code = await createGroup(createName.trim(), createPseudo.trim());
            setCreateName(''); setCreatePseudo('');
            goToDetail(code);
        } catch (err) { setFormError(err.message); }
    };

    const handleJoin = async () => {
        setFormError(null);
        if (!joinCode.trim()) return setFormError('Saisis le code du crew');
        if (!joinPseudo.trim()) return setFormError('Choisis un pseudo');
        try {
            const code = await joinGroup(joinCode.trim(), joinPseudo.trim());
            setJoinCode(''); setJoinPseudo('');
            goToDetail(code);
        } catch (err) { setFormError(err.message || 'Code invalide ou crew introuvable'); }
    };

    const handleLeave = async (code) => {
        if (!window.confirm('Quitter ce crew ?')) return;
        try { await leaveGroup(code); goToList(); } catch {}
    };

    const handleDelete = async (code) => {
        if (!window.confirm('Supprimer ce crew ? Action irréversible.')) return;
        try { await deleteGroup(code); goToList(); } catch {}
    };

    const handleKick = async (code, targetMemberId, pseudo) => {
        if (!window.confirm(`Exclure ${pseudo} du crew ?`)) return;
        try { await removeMember(code, targetMemberId); } catch {}
    };

    const myGroupMeta = myGroups.find(g => g.code === detailCode);

    // ── DETAIL ────────────────────────────────────────────────────────────────
    if (screen === 'detail' && detailCode) {
        const members = activeGroupData?.code === detailCode ? activeGroupData.members : [];
        const isOwner = myGroupMeta?.is_owner;

        return (
            <PanelWrapper onClose={onClose} title="Crew">
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <button onClick={goToList} style={S.btnBack}>
                        <i className="fa-solid fa-chevron-left" style={{ marginRight: 6 }} />
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>{myGroupMeta?.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#666', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{detailCode}</div>
                    </div>
                    <button
                        onClick={() => navigator.clipboard.writeText(detailCode).catch(() => {})}
                        title="Copier le code"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #333', borderRadius: 6, color: '#888', padding: '5px 9px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}
                    >
                        <i className="fa-regular fa-copy" style={{ marginRight: 3 }} />Copier
                    </button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    <button
                        style={{ ...S.btnPrimary, backgroundColor: '#2e7d32' }}
                        onClick={() => { onShowGroupRO && onShowGroupRO(); onClose(); }}
                    >
                        <i className="fa-solid fa-calendar-week" style={{ marginRight: 8 }} />
                        RO du crew
                    </button>
                    <button
                        style={{ ...S.btnPrimary, backgroundColor: '#1565C0' }}
                        onClick={() => { setActiveGroupCode(detailCode); onShowOnMap(); onClose(); }}
                    >
                        <i className="fa-solid fa-map-location-dot" style={{ marginRight: 8 }} />
                        Voir sur la carte
                    </button>
                </div>

                {/* Members */}
                <div style={S.sectionTitle}>Membres ({members.length || '…'})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {members.length === 0 && (
                        <div style={{ color: '#555', textAlign: 'center', padding: '12px 0', fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Chargement…
                        </div>
                    )}
                    {members.map(m => {
                        const isMe = m.member_id === memberId;
                        return (
                            <div key={m.member_id} style={{
                                display: 'flex', alignItems: 'center', padding: '10px 12px',
                                backgroundColor: isMe ? 'rgba(220,40,41,0.07)' : '#222',
                                border: `1px solid ${isMe ? 'rgba(220,40,41,0.2)' : '#2e2e2e'}`,
                                borderRadius: 10, gap: 8,
                            }}>
                                <StatusDot updatedAt={m.position_updated_at} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: '#fff', fontWeight: isMe ? 'bold' : 'normal', fontSize: '0.9rem' }}>
                                        {m.pseudo}
                                        {isMe && <span style={{ color: '#666', fontSize: '0.7rem', fontWeight: 'normal', marginLeft: 6 }}>(moi)</span>}
                                    </div>
                                    <PositionLabel position={m.position} updatedAt={m.position_updated_at} />
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    {!isMe && <button
                                        title={m.favorites ? 'Voir son RO' : 'RO non partagé'}
                                        disabled={!m.favorites}
                                        onClick={() => { onViewMemberRO && onViewMemberRO(m); onClose(); }}
                                        style={{
                                            background: m.favorites ? 'rgba(255,255,255,0.08)' : 'transparent',
                                            border: '1px solid #333', borderRadius: 6,
                                            color: m.favorites ? '#fff' : '#444', padding: '4px 7px',
                                            cursor: m.favorites ? 'pointer' : 'default', fontSize: '0.72rem',
                                        }}
                                    >
                                        <i className="fa-solid fa-calendar-week" />
                                    </button>}
                                    {!isMe && <button
                                        title={m.position ? 'Voir sur la carte' : 'Position inconnue'}
                                        disabled={!m.position}
                                        onClick={() => { onFlyToMember && onFlyToMember(m); onClose(); }}
                                        style={{
                                            background: m.position ? 'rgba(255,255,255,0.08)' : 'transparent',
                                            border: '1px solid #333', borderRadius: 6,
                                            color: m.position ? '#fff' : '#444', padding: '4px 7px',
                                            cursor: m.position ? 'pointer' : 'default', fontSize: '0.72rem',
                                        }}
                                    >
                                        <i className="fa-solid fa-map-location-dot" />
                                    </button>}
                                    {isOwner && !isMe && <button
                                        title="Exclure du crew"
                                        onClick={() => handleKick(detailCode, m.member_id, m.pseudo)}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid #4a2020', borderRadius: 6,
                                            color: '#e57373', padding: '4px 7px',
                                            cursor: 'pointer', fontSize: '0.72rem',
                                        }}
                                    >
                                        <i className="fa-solid fa-user-xmark" />
                                    </button>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quitter / Supprimer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {isOwner ? (
                        <button style={{ ...S.btnSecondary, color: '#e57373', borderColor: '#4a2020' }} onClick={() => handleDelete(detailCode)}>
                            <i className="fa-solid fa-trash" style={{ marginRight: 8 }} />
                            Supprimer le crew
                        </button>
                    ) : (
                        <button style={S.btnSecondary} onClick={() => handleLeave(detailCode)}>
                            <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 8 }} />
                            Quitter le crew
                        </button>
                    )}
                </div>
            </PanelWrapper>
        );
    }

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (screen === 'create') {
        return (
            <PanelWrapper onClose={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                    <button onClick={goToList} style={S.btnBack}><i className="fa-solid fa-chevron-left" /></button>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>Créer un crew</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={S.label}>Nom du crew</label>
                        <input style={S.input} placeholder="Les Zinzins du 56…" value={createName}
                            onChange={e => setCreateName(e.target.value)} maxLength={50} autoFocus />
                    </div>
                    <div>
                        <label style={S.label}>Ton pseudo dans ce crew</label>
                        <input style={S.input} placeholder=" Metalhead42, Roger…" value={createPseudo}
                            onChange={e => setCreatePseudo(e.target.value)} maxLength={30}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
                    </div>
                    {formError && <div style={S.errorBox}>{formError}</div>}
                    <ConsentNotice />
                    <button style={S.btnPrimary} onClick={handleCreate} disabled={loading}>
                        {loading ? 'Création…' : 'Créer le crew'}
                    </button>
                    <button style={S.btnSecondary} onClick={goToList}>Annuler</button>
                </div>
            </PanelWrapper>
        );
    }

    // ── JOIN ──────────────────────────────────────────────────────────────────
    if (screen === 'join') {
        return (
            <PanelWrapper onClose={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                    <button onClick={goToList} style={S.btnBack}><i className="fa-solid fa-chevron-left" /></button>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>Rejoindre un crew</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={S.label}>Code du crew</label>
                        <input
                            style={{ ...S.input, textTransform: 'uppercase', letterSpacing: '3px', fontFamily: 'monospace', fontSize: '1.05rem', textAlign: 'center' }}
                            placeholder="XXXX-0000" value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={9} autoFocus />
                    </div>
                    <div>
                        <label style={S.label}>Ton pseudo dans ce crew</label>
                        <input style={S.input} placeholder="La Bête, Metalhead42…" value={joinPseudo}
                            onChange={e => setJoinPseudo(e.target.value)} maxLength={30}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()} />
                    </div>
                    {formError && <div style={S.errorBox}>{formError}</div>}
                    <ConsentNotice />
                    <button style={S.btnPrimary} onClick={handleJoin} disabled={loading}>
                        {loading ? 'Vérification…' : 'Rejoindre'}
                    </button>
                    <button style={S.btnSecondary} onClick={goToList}>Annuler</button>
                </div>
            </PanelWrapper>
        );
    }

    // ── LIST ──────────────────────────────────────────────────────────────────
    return (
        <PanelWrapper onClose={onClose}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button style={{ ...S.btnPrimary, flex: 1 }} onClick={() => { setFormError(null); setScreen('create'); }}>
                    <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Créer
                </button>
                <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => { setFormError(null); setScreen('join'); }}>
                    <i className="fa-solid fa-right-to-bracket" style={{ marginRight: 6 }} />Rejoindre
                </button>
            </div>

            {error && (
                <div style={S.errorBox}>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>×</button>
                </div>
            )}

            {myGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#555' }}>
                    <i className="fa-solid fa-user-group" style={{ fontSize: '2rem', marginBottom: 12, display: 'block' }} />
                    <div style={{ marginBottom: 6 }}>Aucun crew pour l'instant.</div>
                    <div style={{ fontSize: '0.82rem' }}>Crée un crew ou rejoins celui d'un ami avec son code.</div>
                </div>
            ) : (
                <div>
                    <div style={S.sectionTitle}>Mes crews</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {myGroups.map(g => (
                            <div key={g.code} onClick={() => goToDetail(g.code)} style={{
                                backgroundColor: '#222', border: '1px solid #2e2e2e', borderRadius: 10,
                                padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                                transition: 'border-color 0.15s',
                            }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%', backgroundColor: '#dc2829',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <i className="fa-solid fa-user-group" style={{ color: '#fff', fontSize: '0.9rem' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {g.name}
                                    </div>
                                    <div style={{ color: '#666', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                        {g.code}{g.is_owner ? ' · Créateur' : ''}
                                    </div>
                                </div>
                                <i className="fa-solid fa-chevron-right" style={{ color: '#444', fontSize: '0.85rem' }} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </PanelWrapper>
    );
};

export default GroupsPanel;
