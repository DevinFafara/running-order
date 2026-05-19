import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import WeeklyPDF from '../views/WeeklyPDF';
import { computeMaxSim } from '../views/WeeklyPDF';
import { timeToMinutes } from '../../utils/statsUtils';
import './PDFModal.css';

const ALL_DAYS_ORDER = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const PDFModal = ({ onClose, groups, customEvents, selectedScenes, colorMode, taggedBands, reverse }) => {
    const [selectedMode, setSelectedMode] = useState(null);

    const favBands = groups.filter(g => taggedBands[g.id]);
    const hasFavorites = favBands.length > 0;

    const maxSimOverall = Math.max(
        0,
        ...ALL_DAYS_ORDER.map(day => {
            const dayBands = favBands.filter(g => g.JOUR === day || g.DAY === day);
            return computeMaxSim(dayBands);
        })
    );
    const favWarning = maxSimOverall > 3;

    const PDF_OPTIONS = [
        {
            id: 'full',
            icon: 'fa-calendar-days',
            title: 'RO Complet',
            desc: '2 pages A4 · Tous les groupes · 6 jours · Toutes les scènes',
            fileName: 'Hellfest2026_RO_Complet.pdf',
        },
        {
            id: 'essential',
            icon: 'fa-guitar',
            title: "L'Essentiel",
            desc: '1 page A4 · Tous les groupes · Jeu / Ven / Sam / Dim · Mainstages uniquement',
            fileName: 'Hellfest2026_RO_Essentiel.pdf',
        },
        {
            id: 'favorites',
            icon: 'fa-star',
            title: 'Mes Favoris',
            desc: hasFavorites
                ? `1 page A4 · ${favBands.length} favori${favBands.length !== 1 ? 's' : ''} · Largeur égale par journée`
                : 'Aucun favori sélectionné',
            fileName: 'Hellfest2026_Favoris.pdf',
            warning: favWarning ? `Plus de 3 concerts simultanés (max ${maxSimOverall}) — le rendu peut être serré` : null,
            disabled: !hasFavorites,
        },
    ];

    const selectedOption = PDF_OPTIONS.find(o => o.id === selectedMode);

    return (
        <div className="pdf-modal-overlay" onClick={onClose}>
            <div className="pdf-modal" onClick={e => e.stopPropagation()}>
                <button className="pdf-modal-close" onClick={onClose} aria-label="Fermer">
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <h2 className="pdf-modal-title">
                    <i className="fa-solid fa-file-pdf"></i>
                    Exporter en PDF
                </h2>

                <div className="pdf-modal-options">
                    {PDF_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            className={`pdf-option-card${selectedMode === opt.id ? ' selected' : ''}${opt.disabled ? ' disabled' : ''}`}
                            onClick={() => !opt.disabled && setSelectedMode(opt.id === selectedMode ? null : opt.id)}
                            disabled={opt.disabled}
                        >
                            <i className={`fa-solid ${opt.icon} pdf-option-icon`}></i>
                            <div className="pdf-option-info">
                                <div className="pdf-option-title">{opt.title}</div>
                                <div className="pdf-option-desc">{opt.desc}</div>
                                {opt.warning && (
                                    <div className="pdf-option-warning">
                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                        {opt.warning}
                                    </div>
                                )}
                            </div>
                            {selectedMode === opt.id && (
                                <i className="fa-solid fa-check pdf-option-check"></i>
                            )}
                        </button>
                    ))}
                </div>

                {selectedMode && (
                    <div className="pdf-modal-download">
                        <PDFDownloadLink
                            key={selectedMode}
                            document={
                                <WeeklyPDF
                                    groups={groups}
                                    customEvents={customEvents}
                                    selectedScenes={selectedScenes}
                                    colorMode={colorMode}
                                    taggedBands={taggedBands}
                                    reverse={reverse}
                                    pdfMode={selectedMode}
                                />
                            }
                            fileName={selectedOption.fileName}
                            className="pdf-download-btn"
                        >
                            {({ loading, error }) => (
                                <>
                                    <i className={`fa-solid ${error ? 'fa-circle-exclamation' : loading ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                                    <span>
                                        {error ? 'Erreur de génération' : loading ? 'Génération en cours...' : 'Télécharger le PDF'}
                                    </span>
                                </>
                            )}
                        </PDFDownloadLink>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFModal;
