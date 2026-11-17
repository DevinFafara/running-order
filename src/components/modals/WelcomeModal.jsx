import React, { useState } from 'react';
import './WelcomeModal.css';

/**
 * Avertissement affiché à chaque lancement.
 * isDemo : programmation de démo (groupes « ??? »), sinon groupes annoncés avec horaires projetés depuis le RO 2026.
 */
const WelcomeModal = ({ isDemo }) => {
    const [open, setOpen] = useState(true);
    if (!open) return null;
    const close = () => setOpen(false);

    return (
        <div className="welcome-popup-overlay" onClick={close}>
            <div className="welcome-popup-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="welcome-popup-title">
                <div className="welcome-popup-header">
                    <h2 id="welcome-popup-title">{isDemo ? '⚠️ Programmation 2027 à venir' : '⚠️ Running Order provisoire'}</h2>
                    <button className="welcome-popup-close" onClick={close} aria-label="Fermer">
                        ×
                    </button>
                </div>
                <div className="welcome-popup-body">
                    {isDemo ? (<>
                        <p>
                            <strong>Attention :</strong> cette programmation n&apos;a rien d&apos;officiel.
                        </p>
                        <p>
                            Aucun groupe n&apos;a encore été annoncé pour le Hellfest 2027. En attendant, les groupes sont
                            remplacés par des <strong>« ??? »</strong>, et les créneaux comme les horaires ne sont
                            qu&apos;une <strong>hypothèse</strong>, basée sur l&apos;édition 2026.
                        </p>
                        <p className="welcome-popup-footer">
                            Profitez-en pour découvrir la nouvelle version de l&apos;outil et régler l&apos;affichage à votre goût, en attendant les vraies annonces ! 🤘
                        </p>
                    </>) : (<>
                        <p>
                            <strong>Attention :</strong> ce Running Order n&apos;est pas encore officiel.
                        </p>
                        <p>
                            Les groupes sont ceux de l&apos;affiche du Hellfest 2027, mais <strong>l&apos;ordre de passage et la durée
                            des créneaux</strong> ne sont qu&apos;une projection basée sur le Running Order 2026.
                        </p>
                        <p className="welcome-popup-footer">
                            Les horaires officiels remplaceront cette projection dès leur publication. 🤘
                        </p>
                    </>)}
                </div>
                <div className="welcome-popup-actions">
                    <button className="welcome-popup-button" onClick={close}>
                        J&apos;ai compris
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
