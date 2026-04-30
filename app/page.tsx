'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Info, Plus, X } from 'lucide-react';

interface Ville {
  id: number;
  nom: string;
}

interface Etablissement {
  id: number;
  nom: string;
  ville_id: number;
}

interface Periode {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  ville_id: number;
}

interface Controleur {
  id: number;
  nom: string;
  prenom: string;
  ville_id: number;
}

interface Volet {
  id: number;
  code: string;
  libelle: string;
  ordre: number;
  rubriques: Array<{
    id: number;
    numero: number;
    libelle: string;
    composante_evaluee?: string;
    criteres_indicateurs?: string;
    mode_verification?: string;
  }>;
}

interface BaremeItem {
  note: number;
  libelle: string;
  description: string;
}

interface RubriqueEvaluation {
  rubriqueId: number;
  note: number | null;
  commentaire: string;
  showObservations: boolean;
  showDetails: boolean; // Pour afficher/masquer Critères et Mode de vérification
}

export default function HomePage() {
  // Données de référence
  const [villes, setVilles] = useState<Ville[]>([]);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [controleurs, setControleurs] = useState<Controleur[]>([]);
  const [volets, setVolets] = useState<Volet[]>([]);
  const [bareme, setBareme] = useState<BaremeItem[]>([]);

  // Sélections du formulaire - ordre strict : Ville → Établissement → Période → Contrôleur → Volet
  const [selectedVille, setSelectedVille] = useState<number | null>(null);
  const [selectedEtablissement, setSelectedEtablissement] = useState<number | null>(null);
  const [selectedPeriode, setSelectedPeriode] = useState<number | null>(null);
  const [selectedControleur, setSelectedControleur] = useState<number | null>(null);
  const [selectedVolet, setSelectedVolet] = useState<number | null>(null);

  // Évaluations par rubrique
  const [evaluations, setEvaluations] = useState<Record<number, RubriqueEvaluation>>({});
  const [showBareme, setShowBareme] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const baremeModalRef = useRef<HTMLDivElement>(null);
  const detailsRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Vérifier le mode maintenance au chargement
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/maintenance');
        const data = await response.json();
        if (data.enabled) {
          setMaintenanceMode(true);
          window.location.href = '/maintenance';
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
      }
    };
    checkMaintenance();
  }, []);

  // Fermer le modal du barème quand on clique en dehors (sans toast)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (baremeModalRef.current && !baremeModalRef.current.contains(event.target as Node)) {
        setShowBareme(false);
        // Pas de toast sur fermeture automatique
      }
    };

    if (showBareme) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBareme]);

  // Fermer les détails (critères/mode) au clic ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(detailsRefs.current).forEach(([rubriqueId, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          const id = parseInt(rubriqueId, 10);
          setEvaluations((prev) => ({
            ...prev,
            [id]: {
              ...prev[id],
              showDetails: false,
            },
          }));
        }
      });
    };

    const hasOpenDetails = Object.values(evaluations).some((e) => e?.showDetails);
    if (hasOpenDetails) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [evaluations]);

  useEffect(() => {
    // Charger les données de référence
    Promise.all([
      fetch('/api/villes').then((r) => r.json()),
      fetch('/api/volets').then((r) => r.json()),
      fetch('/api/bareme').then((r) => r.json()),
    ])
      .then(([villesData, voletsData, baremeData]) => {
        setVilles(villesData.villes || []);
        setVolets(voletsData.volets || []);
        setBareme(baremeData.bareme || []);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        toast.error('Erreur lors du chargement des données');
      });
  }, []);

  // Charger les établissements et contrôleurs quand la ville change
  useEffect(() => {
    if (selectedVille) {
      Promise.all([
        fetch(`/api/etablissements?villeId=${selectedVille}`).then((r) => r.json()),
        fetch(`/api/controleurs?villeId=${selectedVille}`).then((r) => r.json()),
        fetch(`/api/periodes?villeId=${selectedVille}`).then((r) => r.json()),
      ])
        .then(([etabData, controleursData, periodesData]) => {
          setEtablissements(etabData.etablissements || []);
          setControleurs(controleursData.controleurs || []);
          setPeriodes(periodesData.periodes || []);
        })
        .catch(() => {
          toast.error('Erreur lors du chargement des données');
        });
    } else {
      setEtablissements([]);
      setControleurs([]);
      setPeriodes([]);
      setSelectedEtablissement(null);
      setSelectedPeriode(null);
      setSelectedControleur(null);
    }
  }, [selectedVille]);

  // Réinitialiser les sélections dépendantes quand la ville change
  useEffect(() => {
    if (!selectedVille) {
      setSelectedEtablissement(null);
      setSelectedPeriode(null);
      setSelectedControleur(null);
      setSelectedVolet(null);
    }
  }, [selectedVille]);

  // Réinitialiser la période et le contrôleur quand l'établissement change
  useEffect(() => {
    if (!selectedEtablissement) {
      setSelectedPeriode(null);
      setSelectedControleur(null);
      setSelectedVolet(null);
    }
  }, [selectedEtablissement]);

  // Réinitialiser le volet quand la période change
  useEffect(() => {
    if (!selectedPeriode) {
      setSelectedVolet(null);
    }
  }, [selectedPeriode]);

  // Réinitialiser le volet quand le contrôleur change
  useEffect(() => {
    if (!selectedControleur) {
      setSelectedVolet(null);
    }
  }, [selectedControleur]);

  // Initialiser les évaluations quand le volet change
  useEffect(() => {
    if (selectedVolet) {
      const volet = volets.find((v) => v.id === selectedVolet);
      if (volet && volet.rubriques) {
        const initialEvaluations: Record<number, RubriqueEvaluation> = {};
        volet.rubriques.forEach((rubrique) => {
          initialEvaluations[rubrique.id] = {
            rubriqueId: rubrique.id,
            note: null,
            commentaire: '',
            showObservations: false,
            showDetails: false,
          };
        });
        setEvaluations(initialEvaluations);
      }
    } else {
      setEvaluations({});
    }
  }, [selectedVolet, volets]);

  const updateRubriqueNote = (rubriqueId: number, note: number) => {
    setEvaluations((prev) => ({
      ...prev,
      [rubriqueId]: { ...prev[rubriqueId], rubriqueId, note },
    }));
  };

  const updateRubriqueCommentaire = (rubriqueId: number, commentaire: string) => {
    setEvaluations((prev) => ({
      ...prev,
      [rubriqueId]: { ...prev[rubriqueId], rubriqueId, commentaire },
    }));
  };

  const toggleObservations = (rubriqueId: number) => {
    setEvaluations((prev) => ({
      ...prev,
      [rubriqueId]: {
        ...prev[rubriqueId],
        showObservations: !prev[rubriqueId]?.showObservations,
      },
    }));
  };

  const toggleDetails = (rubriqueId: number) => {
    setEvaluations((prev) => ({
      ...prev,
      [rubriqueId]: {
        ...prev[rubriqueId],
        rubriqueId,
        showDetails: !prev[rubriqueId]?.showDetails,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !selectedVille ||
      !selectedEtablissement ||
      !selectedPeriode ||
      !selectedControleur ||
      !selectedVolet
    ) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Trouver le volet actif et ses rubriques
    const activeVolet = volets.find((v) => v.id === selectedVolet);
    if (!activeVolet || !activeVolet.rubriques) {
      toast.error('Volet invalide');
      return;
    }

    // Vérifier que toutes les rubriques du volet ont une note
    const rubriquesAvecNote = activeVolet.rubriques
      .map((rubrique) => evaluations[rubrique.id])
      .filter((e) => e && e.note !== null && e.note !== undefined);

    if (rubriquesAvecNote.length !== activeVolet.rubriques.length) {
      const rubriquesManquantes = activeVolet.rubriques.length - rubriquesAvecNote.length;
      toast.error(`Veuillez attribuer une note à toutes les rubriques. Il manque ${rubriquesManquantes} note(s).`);
      return;
    }

    // Trouver la mission correspondante à la période
    const periode = periodes.find((p) => p.id === selectedPeriode);
    if (!periode) {
      toast.error('Période invalide');
      return;
    }

    setIsSubmitting(true);

    try {
      // Récupérer ou créer la mission correspondante
      const missionResponse = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: `Mission ${villes.find((v) => v.id === selectedVille)?.nom || ''}`,
          date_debut: periode.date_debut,
          date_fin: periode.date_fin,
        }),
      });
      const missionData = await missionResponse.json();
      const missionId = missionData.mission?.id || missionData.id;

      // Vérifier si une évaluation existe déjà pour cette combinaison
      const checkResponse = await fetch(
        `/api/evaluations/check?controleurId=${selectedControleur}&voletId=${selectedVolet}&periodeId=${selectedPeriode}&etablissementId=${selectedEtablissement}&villeId=${selectedVille}`
      );
      const checkData = await checkResponse.json();

      let shouldReplace = false;
      if (checkData.exists && checkData.evaluation) {
        const confirmReplace = confirm(
          `Une évaluation existe déjà pour ce contrôleur, ce volet, cette période et cet établissement (soumise le ${new Date(checkData.evaluation.created_at).toLocaleDateString('fr-FR')}).\n\nVoulez-vous remplacer l'ancienne évaluation par la nouvelle ?`
        );
        if (!confirmReplace) {
          setIsSubmitting(false);
          toast.info('Évaluation annulée. L\'ancienne évaluation est conservée.');
          return;
        }
        shouldReplace = true;
      }

      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: missionId,
          villeId: selectedVille,
          etablissementVisiteId: selectedEtablissement,
          controleurId: selectedControleur,
          voletId: selectedVolet,
          replace: shouldReplace,
          rubriques: rubriquesAvecNote.map((e) => ({
            rubriqueId: e.rubriqueId,
            note: e.note,
            commentaire: e.commentaire || null,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Évaluation enregistrée avec succès.');
        // Conserver les sélections pour permettre de changer de volet facilement
        // Réinitialiser seulement le volet et les évaluations
        setSelectedVolet(null);
        setEvaluations({});
        // Les autres champs (Ville, Établissement, Période, Contrôleur) sont conservés
        // Si l'utilisateur change de ville, les champs dépendants seront réinitialisés automatiquement
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Êtes-vous sûr de vouloir annuler ?')) {
      setSelectedVille(null);
      setSelectedEtablissement(null);
      setSelectedPeriode(null);
      setSelectedControleur(null);
      setSelectedVolet(null);
      setEvaluations({});
      toast.error('Évaluation annulée.');
    }
  };

  const handleCloseBareme = () => {
    setShowBareme(false);
    // Pas de toast sur fermeture du barème
  };

  const activeVolet = volets.find((v) => v.id === selectedVolet);

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 overflow-x-hidden w-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
        Contrôle des Banques
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélections guidées dans l'ordre strict */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Informations de base</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Ville */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Ville *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedVille || ''}
                  onChange={(e) => {
                    const villeId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedVille(villeId);
                  }}
                  required
                >
                  <option value="">Sélectionner une ville</option>
                  {villes.map((ville) => (
                    <option key={ville.id} value={ville.id}>
                      {ville.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Établissement visité */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Établissement visité *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedEtablissement || ''}
                  onChange={(e) => {
                    const etabId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedEtablissement(etabId);
                  }}
                  required
                  disabled={!selectedVille}
                >
                  <option value="">Sélectionner un établissement</option>
                  {etablissements.map((etab) => (
                    <option key={etab.id} value={etab.id}>
                      {etab.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Période */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Période *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedPeriode || ''}
                  onChange={(e) => {
                    const periodeId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedPeriode(periodeId);
                  }}
                  required
                  disabled={!selectedVille || !selectedEtablissement}
                >
                  <option value="">Sélectionner une période</option>
                  {periodes.map((periode) => (
                    <option key={periode.id} value={periode.id}>
                      {periode.libelle}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Contrôleur */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Contrôleur *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedControleur || ''}
                  onChange={(e) => {
                    const controleurId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedControleur(controleurId);
                  }}
                  required
                  disabled={!selectedVille}
                >
                  <option value="">Sélectionner un contrôleur</option>
                  {controleurs.map((controleur) => (
                    <option key={controleur.id} value={controleur.id}>
                      {controleur.nom} {controleur.prenom}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Volet */}
              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">Volet *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedVolet || ''}
                  onChange={(e) => {
                    const voletId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedVolet(voletId);
                  }}
                  required
                  disabled={!selectedVille || !selectedEtablissement || !selectedPeriode || !selectedControleur}
                >
                  <option value="">Sélectionner un volet</option>
                  {volets.map((volet) => (
                    <option key={volet.id} value={volet.id}>
                      {volet.libelle}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Évaluation des rubriques */}
        {activeVolet && activeVolet.rubriques && activeVolet.rubriques.length > 0 && (
          <div className="card bg-base-100 shadow-xl overflow-x-hidden">
            <div className="card-body p-4 sm:p-6 overflow-x-hidden">
              <div className="mb-4">
                <h2 className="card-title text-sm sm:text-base md:text-lg mb-2 sm:mb-0">{activeVolet.libelle}</h2>
                <div className="sm:hidden mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline w-full"
                    onClick={() => setShowBareme(true)}
                  >
                    <Info size={16} className="mr-2" />
                    <span>Barème</span>
                  </button>
                </div>
                <div className="hidden sm:block">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline flex-shrink-0"
                    onClick={() => setShowBareme(true)}
                  >
                    <Info size={16} className="mr-2" />
                    <span>Afficher le barème</span>
                  </button>
                </div>
              </div>

              {/* Modal du barème */}
              {showBareme && (
                <div className="modal modal-open">
                  <div className="modal-box max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" ref={baremeModalRef}>
                    <h3 className="font-bold text-lg mb-4">Barème d&apos;évaluation</h3>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {bareme.map((item) => (
                        <div key={item.note} className="border-b pb-2">
                          <div className="font-semibold break-words">
                            {item.note} - {item.libelle}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-400 break-words">{item.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="modal-action sticky bottom-0 bg-base-100 pt-4">
                      <button
                        type="button"
                        className="btn btn-error"
                        onClick={handleCloseBareme}
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 overflow-x-hidden">
                {activeVolet.rubriques.map((rubrique) => {
                  const evaluation = evaluations[rubrique.id] || {
                    rubriqueId: rubrique.id,
                    note: null,
                    commentaire: '',
                    showObservations: false,
                    showDetails: false,
                  };
                  return (
                    <div key={rubrique.id} className="border rounded-lg p-3 sm:p-4 overflow-x-hidden">
                      {/* Afficher directement la composante évaluée comme titre avec le numéro */}
                      <div className="mb-3">
                        <span className="font-semibold text-base sm:text-lg break-words">
                          {rubrique.composante_evaluee 
                            ? (rubrique.composante_evaluee.match(/^\d+[–-]/) 
                                ? rubrique.composante_evaluee.replace(/^(\d+)[–-]/, `${rubrique.numero}-`)
                                : `${rubrique.numero}- ${rubrique.composante_evaluee}`)
                            : `${rubrique.numero}- ${rubrique.libelle}`
                          }
                        </span>
                      </div>

                      {/* Bouton pour afficher les détails (Critères et Mode de vérification) */}
                      {!evaluation.showDetails && (rubrique.criteres_indicateurs || rubrique.mode_verification) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline mb-4 w-full sm:w-auto"
                          onClick={() => toggleDetails(rubrique.id)}
                        >
                          <Info size={16} className="mr-1 sm:mr-2 flex-shrink-0" />
                          <span className="hidden sm:inline">Afficher les détails (Critères / Mode de vérification)</span>
                          <span className="sm:hidden">Détails</span>
                        </button>
                      )}

                      {/* Colonnes Critères et Mode de vérification - affichage conditionnel */}
                      {evaluation.showDetails && (rubrique.criteres_indicateurs || rubrique.mode_verification) && (
                        <div
                          ref={(el) => {
                            detailsRefs.current[rubrique.id] = el;
                          }}
                          className="mb-4 border-2 border-primary/20 rounded-lg p-4 md:p-6 bg-base-100 shadow-sm max-h-[60vh] overflow-y-auto"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-4">
                            {rubrique.criteres_indicateurs && (
                              <div className="space-y-2 min-w-0">
                                <h4 className="font-bold text-base text-primary">Critères / Indicateurs:</h4>
                                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                                  {rubrique.criteres_indicateurs}
                                </p>
                              </div>
                            )}
                            {rubrique.mode_verification && (
                              <div className="space-y-2 min-w-0">
                                <h4 className="font-bold text-base text-primary">Mode de vérification:</h4>
                                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                                  {rubrique.mode_verification}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end pt-2 border-t border-base-300 sticky bottom-0 bg-base-100">
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => toggleDetails(rubrique.id)}
                            >
                              <X size={16} className="mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Masquer les détails</span>
                              <span className="sm:hidden">Masquer</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Note */}
                      <div className="form-control mb-3">
                        <label className="label">
                          <span className="label-text">Note (1-5) *</span>
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {[1, 2, 3, 4, 5].map((note) => (
                            <button
                              key={note}
                              type="button"
                              className={`btn btn-sm ${
                                evaluation.note === note
                                  ? 'btn-primary'
                                  : 'btn-outline'
                              }`}
                              onClick={() => updateRubriqueNote(rubrique.id, note)}
                            >
                              {note}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Observations conditionnelles */}
                      {!evaluation.showObservations ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost w-full sm:w-auto"
                          onClick={() => toggleObservations(rubrique.id)}
                        >
                          <Plus size={16} className="mr-1 sm:mr-2 flex-shrink-0" />
                          <span className="hidden sm:inline">Ajouter une observation / recommandation</span>
                          <span className="sm:hidden">Observation</span>
                        </button>
                      ) : (
                        <div className="form-control max-h-[50vh] overflow-y-auto">
                          <div className="flex items-center justify-between mb-2">
                            <label className="label">
                              <span className="label-text">Observations / Recommandations</span>
                            </label>
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost flex-shrink-0"
                              onClick={() => toggleObservations(rubrique.id)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <textarea
                            className="textarea textarea-bordered resize-none w-full"
                            rows={3}
                            value={evaluation.commentaire || ''}
                            onChange={(e) =>
                              updateRubriqueCommentaire(rubrique.id, e.target.value)
                            }
                            placeholder="Saisir vos observations ou recommandations..."
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="form-control mt-6">
          <div className="flex gap-4">
            <button
              type="button"
              className="flex-1 px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enregistrement...' : 'Valider'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
