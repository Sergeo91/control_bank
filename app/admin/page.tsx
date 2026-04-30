'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Settings, Users, Building2, Calendar, UserCheck, Shield, BarChart3, Download, FileText, Trash2, Eye, X, LogOut, Plus, Edit, RotateCcw } from 'lucide-react';

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
  ville_id: number;
  date_debut: string;
  date_fin: string;
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
}

interface ControleurStat {
  id: number;
  nom: string;
  prenom: string;
  nom_complet: string;
  volets_evalues?: number;
  derniere_evaluation?: string;
  derniere_soumission?: string;
}

interface ControleursStats {
  total: number;
  avec_evaluations: {
    nombre: number;
    controleurs: ControleurStat[];
  };
  sans_evaluations: {
    nombre: number;
    controleurs: ControleurStat[];
  };
}

interface RubriqueEvaluation {
  rubrique_id: number;
  numero: number;
  libelle: string;
  composante_evaluee: string | null;
  criteres_indicateurs: string | null;
  mode_verification: string | null;
  note: number;
  commentaire: string | null;
  date_evaluation: string;
  created_at: string;
}

interface EvaluationDetail {
  evaluation: {
    controleur_nom: string;
    ville_nom: string;
    etablissement_nom: string;
    volet_libelle: string;
    periode_libelle: string;
    date_evaluation: string;
    date_soumission: string;
  } | null;
  rubriques: RubriqueEvaluation[];
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'synthese' | 'controleurs' | 'evaluations' | 'maintenance' | 'users' | 'referentiels' | 'restore'>('synthese');

  // Fonction helper pour récupérer le token d'authentification
  const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('session_token');
    }
    return null;
  };

  // Fonction helper pour créer les headers avec authentification
  const getAuthHeaders = (): HeadersInit => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };
  
  // Données pour les filtres
  const [villes, setVilles] = useState<Ville[]>([]);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [controleurs, setControleurs] = useState<Controleur[]>([]);
  const [volets, setVolets] = useState<Volet[]>([]);
  
  // Filtres de synthèse
  const [filterVille, setFilterVille] = useState<number | null>(null);
  const [filterEtablissement, setFilterEtablissement] = useState<number | null>(null);
  const [filterPeriode, setFilterPeriode] = useState<number | null>(null);
  const [filterControleur, setFilterControleur] = useState<number | null>(null);
  const [filterVolet, setFilterVolet] = useState<number | null>(null);
  const [isUpdatingRubriques, setIsUpdatingRubriques] = useState(false);

  // Statistiques contrôleurs
  const [controleursStats, setControleursStats] = useState<ControleursStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showControleursAvecEvaluations, setShowControleursAvecEvaluations] = useState(true);
  const [showControleursSansEvaluations, setShowControleursSansEvaluations] = useState(true);

  // Évaluation détaillée
  const [evaluationDetail, setEvaluationDetail] = useState<EvaluationDetail | null>(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  useEffect(() => {
    checkAuthentication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        setShowLoginForm(true);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!data.user || data.user.role !== 'admin') {
        setIsLoading(false);
        setShowLoginForm(true);
        return;
      }

      setIsAuthenticated(true);
      loadMaintenanceStatus();
      loadSyntheseData();
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsLoading(false);
      setShowLoginForm(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        if (data.user?.role !== 'admin') {
          toast.error('Accès refusé. Seuls les administrateurs peuvent accéder à cette page.');
          setIsLoggingIn(false);
          return;
        }
        localStorage.setItem('session_token', data.token);
        toast.success('Connexion réussie');
        setShowLoginForm(false);
        setIsAuthenticated(true);
        loadMaintenanceStatus();
        loadSyntheseData();
      } else {
        toast.error(data.error || 'Email ou mot de passe incorrect');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error('Erreur lors de la connexion');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadSyntheseData = async () => {
    try {
      const [villesRes, voletsRes] = await Promise.all([
        fetch('/api/villes').then((r) => r.json()),
        fetch('/api/volets').then((r) => r.json()),
      ]);
      setVilles(villesRes.villes || []);
      setVolets(voletsRes.volets || []);
    } catch (error) {
      console.error('Error loading synthese data:', error);
    }
  };

  useEffect(() => {
    if (filterVille) {
      Promise.all([
        fetch(`/api/etablissements?villeId=${filterVille}`).then((r) => r.json()),
        fetch(`/api/controleurs?villeId=${filterVille}`).then((r) => r.json()),
        fetch(`/api/periodes?villeId=${filterVille}`).then((r) => r.json()),
      ])
        .then(([etabData, controleursData, periodesData]) => {
          setEtablissements(etabData.etablissements || []);
          setControleurs(controleursData.controleurs || []);
          setPeriodes(periodesData.periodes || []);
        })
        .catch((error) => {
          console.error('Error loading filter data:', error);
        });
    } else {
      setEtablissements([]);
      setControleurs([]);
      setPeriodes([]);
    }
  }, [filterVille]);

  // Charger les statistiques contrôleurs
  useEffect(() => {
    if (activeTab === 'controleurs' && filterVille && filterEtablissement && filterPeriode && filterVolet) {
      loadControleursStats();
    } else if (activeTab === 'controleurs' && filterVille && filterEtablissement && filterPeriode && !filterVolet) {
      // Réinitialiser les stats si le volet est désélectionné
      setControleursStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterVille, filterEtablissement, filterPeriode, filterVolet]);

  const loadControleursStats = async () => {
    if (!filterVille || !filterEtablissement || !filterPeriode || !filterVolet) {
      return;
    }

    setLoadingStats(true);
    try {
      const params = new URLSearchParams();
      params.append('villeId', filterVille.toString());
      params.append('etablissementId', filterEtablissement.toString());
      params.append('periodeId', filterPeriode.toString());
      params.append('voletId', filterVolet.toString());

      const response = await fetch(`/api/admin/controleurs-stats?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}: ${response.statusText}`);
      }
      setControleursStats(data);
      
      // Afficher un toast si aucun contrôleur n'a soumis d'évaluation
      if (data.avec_evaluations.nombre === 0 && data.total > 0) {
        toast.info(`Aucun contrôleur n'a encore soumis d'évaluation pour cette combinaison (Ville, Établissement, Période, Volet). ${data.total} contrôleur(s) de cette ville n'ont pas encore soumis.`);
      } else if (data.total === 0) {
        toast.warning('Aucun contrôleur trouvé pour cette ville.');
      }
    } catch (error: any) {
      console.error('Error loading controleurs stats:', error);
      toast.error(error.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadEvaluationDetail = async () => {
    if (!filterControleur || !filterVolet || !filterPeriode || !filterEtablissement || !filterVille) {
      toast.error('Veuillez sélectionner tous les filtres nécessaires (Ville, Établissement, Période, Contrôleur, Volet)');
      return;
    }

    setLoadingEvaluation(true);
    try {
      const params = new URLSearchParams();
      params.append('controleurId', filterControleur.toString());
      params.append('voletId', filterVolet.toString());
      params.append('periodeId', filterPeriode.toString());
      params.append('etablissementId', filterEtablissement.toString());
      params.append('villeId', filterVille.toString());

      const response = await fetch(`/api/admin/evaluations?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}: ${response.statusText}. Vérifiez que l'évaluation existe pour cette combinaison de filtres.`);
      }
      if (!data.evaluation || data.rubriques.length === 0) {
        throw new Error('Aucune évaluation trouvée pour cette combinaison de filtres (Ville, Établissement, Période, Contrôleur, Volet)');
      }
      setEvaluationDetail(data);
      setShowEvaluationModal(true);
    } catch (error: any) {
      console.error('Error loading evaluation detail:', error);
      toast.error(error.message || 'Erreur lors du chargement de l\'évaluation');
    } finally {
      setLoadingEvaluation(false);
    }
  };

  const handleDeleteEvaluation = async (deleteAll: boolean = false) => {
    if (deleteAll) {
      if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUTES les évaluations ? Cette action est irréversible.')) {
        return;
      }
    } else {
      if (!filterControleur || !filterVolet || !filterPeriode || !filterEtablissement || !filterVille) {
        toast.error('Veuillez sélectionner tous les filtres nécessaires');
        return;
      }
      if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action est irréversible.')) {
        return;
      }
    }

    try {
      const params = new URLSearchParams();
      if (deleteAll) {
        params.append('deleteAll', 'true');
      } else {
        params.append('controleurId', filterControleur!.toString());
        params.append('voletId', filterVolet!.toString());
        params.append('periodeId', filterPeriode!.toString());
        params.append('etablissementId', filterEtablissement!.toString());
        params.append('villeId', filterVille!.toString());
      }

      const response = await fetch(`/api/admin/evaluations?${params.toString()}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}: ${response.statusText}. ${deleteAll ? 'Impossible de supprimer toutes les évaluations.' : 'Impossible de supprimer cette évaluation. Vérifiez que l\'évaluation existe.'}`);
      }

      toast.success(data.message || 'Évaluation(s) supprimée(s) avec succès');
      
      // Recharger les statistiques si nécessaire
      if (activeTab === 'controleurs') {
        loadControleursStats();
      }
      if (showEvaluationModal) {
        setShowEvaluationModal(false);
        setEvaluationDetail(null);
      }
    } catch (error: any) {
      console.error('Error deleting evaluation:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleExportEvaluation = async () => {
    if (!evaluationDetail || !evaluationDetail.evaluation) {
      toast.error('Aucune évaluation à exporter. Veuillez d\'abord charger une évaluation.');
      return;
    }

    try {
      // Créer un fichier Excel avec les données de l'évaluation
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      const worksheetData = [
        ['Contrôleur', evaluationDetail.evaluation.controleur_nom],
        ['Ville', evaluationDetail.evaluation.ville_nom],
        ['Établissement', evaluationDetail.evaluation.etablissement_nom],
        ['Volet', evaluationDetail.evaluation.volet_libelle],
        ['Période', evaluationDetail.evaluation.periode_libelle],
        ['Date d\'évaluation', new Date(evaluationDetail.evaluation.date_evaluation).toLocaleDateString('fr-FR')],
        ['Date de soumission', new Date(evaluationDetail.evaluation.date_soumission).toLocaleDateString('fr-FR')],
        [],
        ['Numéro', 'Libellé', 'Composante évaluée', 'Critères / Indicateurs', 'Mode de vérification', 'Note', 'Commentaire'],
        ...evaluationDetail.rubriques.map((r) => [
          r.numero,
          r.libelle,
          r.composante_evaluee || '',
          r.criteres_indicateurs || '',
          r.mode_verification || '',
          r.note,
          r.commentaire || '',
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Évaluation');

      const fileName = `evaluation_${evaluationDetail.evaluation.controleur_nom.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Export Excel généré avec succès.');
    } catch (error: any) {
      console.error('Error exporting evaluation:', error);
      toast.error(error.message || 'Erreur lors de l\'export Excel. Vérifiez que toutes les données nécessaires sont disponibles.');
    }
  };

  const handleExport = async () => {
    if (!filterVolet) {
      toast.error('Veuillez sélectionner un volet avant d\'exporter');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filterVille) params.append('villeId', filterVille.toString());
      if (filterEtablissement) params.append('etablissementId', filterEtablissement.toString());
      if (filterControleur) params.append('controleurId', filterControleur.toString());
      params.append('voletId', filterVolet.toString());
      if (filterPeriode) {
        const periode = periodes.find((p) => p.id === filterPeriode);
        if (periode) {
          const missionRes = await fetch('/api/missions');
          const missionData = await missionRes.json();
          const mission = missionData.missions?.find(
            (m: any) => m.date_debut === periode.libelle.split(' ')[1]?.replace(/\//g, '-')
          );
          if (mission) params.append('missionId', mission.id.toString());
        }
      }

      const response = await fetch(`/api/dashboard/export?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}. Vérifiez que le volet est sélectionné et qu'il existe des données à exporter.`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluations_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export Excel généré avec succès.');
    } catch (error: any) {
      console.error('Error exporting:', error);
      toast.error(error.message || 'Erreur lors de l\'export Excel');
    }
  };

  const handleUpdateRubriques = async () => {
    setIsUpdatingRubriques(true);
    try {
      const response = await fetch('/api/admin/update-rubriques', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      if (data.skipped) {
        toast.info(data.message);
      } else {
        toast.success(data.message || `✅ ${data.updated} rubriques mises à jour avec succès`);
      }
    } catch (error: any) {
      console.error('Error updating rubriques:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour des rubriques');
    } finally {
      setIsUpdatingRubriques(false);
    }
  };

  const loadMaintenanceStatus = async () => {
    try {
      const response = await fetch('/api/maintenance');
      const data = await response.json();
      setMaintenanceMode(data.enabled || false);
    } catch (error) {
      console.error('Error loading maintenance status:', error);
    }
  };

  const toggleMaintenance = async () => {
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !maintenanceMode }),
      });

      const data = await response.json();
      if (response.ok) {
        setMaintenanceMode(data.enabled);
        toast.success(
          data.enabled
            ? 'Mode maintenance activé'
            : 'Mode maintenance désactivé'
        );
      } else {
        toast.error(data.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const handleLogout = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      }
      localStorage.removeItem('session_token');
      toast.success('Déconnexion réussie');
      // Réinitialiser l'état et afficher le formulaire de connexion
      setIsAuthenticated(false);
      setShowLoginForm(true);
      setLoginPassword('');
    } catch (error) {
      console.error('Error logging out:', error);
      // Déconnexion même en cas d'erreur
      localStorage.removeItem('session_token');
      setIsAuthenticated(false);
      setShowLoginForm(true);
      setLoginPassword('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Afficher le formulaire de connexion si non authentifié
  if (!isAuthenticated || showLoginForm) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-6">
            <div className="flex items-center justify-center mb-6">
              <Building2 className="text-accent" size={48} />
            </div>
            <h1 className="text-2xl font-bold text-center mb-6">Connexion Admin</h1>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={isLoggingIn}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Mot de passe</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={isLoggingIn}
                />
              </div>

              <div className="form-control mt-6">
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Connexion...' : 'Se connecter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Administration
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-outline btn-error btn-sm sm:btn-md"
          title="Déconnexion"
        >
          <LogOut className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>

      <div className="tabs tabs-boxed mb-4 sm:mb-6 overflow-x-auto">
        <button
          type="button"
          className={`tab ${activeTab === 'synthese' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('synthese')}
        >
          <BarChart3 className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Synthèse</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'controleurs' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('controleurs')}
        >
          <UserCheck className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Contrôleurs</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'evaluations' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('evaluations')}
        >
          <FileText className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Évaluations</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'maintenance' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('maintenance')}
        >
          <Settings className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Maintenance</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'users' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Utilisateurs</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'referentiels' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('referentiels')}
        >
          <Building2 className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Référentiels</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'restore' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('restore')}
        >
          <Shield className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Restauration</span>
        </button>
      </div>

      {activeTab === 'synthese' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="card-title text-lg sm:text-xl">Synthèse des Évaluations</h2>
              <button
                type="button"
                className="px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                onClick={handleExport}
                disabled={!filterVolet}
              >
                <Download className="inline mr-2" size={16} />
                Exporter
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Ville</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterVille || ''}
                  onChange={(e) => {
                    const villeId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterVille(villeId);
                    setFilterEtablissement(null);
                    setFilterPeriode(null);
                    setFilterControleur(null);
                  }}
                >
                  <option value="">Toutes les villes</option>
                  {villes.map((ville) => (
                    <option key={ville.id} value={ville.id}>
                      {ville.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Établissement</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterEtablissement || ''}
                  onChange={(e) => {
                    const etabId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterEtablissement(etabId);
                  }}
                  disabled={!filterVille}
                >
                  <option value="">Tous les établissements</option>
                  {etablissements.map((etab) => (
                    <option key={etab.id} value={etab.id}>
                      {etab.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Période</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterPeriode || ''}
                  onChange={(e) => {
                    const periodeId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterPeriode(periodeId);
                  }}
                  disabled={!filterVille}
                >
                  <option value="">Toutes les périodes</option>
                  {periodes.map((periode) => (
                    <option key={periode.id} value={periode.id}>
                      {periode.libelle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Contrôleur</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterControleur || ''}
                  onChange={(e) => {
                    const controleurId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterControleur(controleurId);
                  }}
                  disabled={!filterVille}
                >
                  <option value="">Tous les contrôleurs</option>
                  {controleurs.map((controleur) => (
                    <option key={controleur.id} value={controleur.id}>
                      {controleur.nom} {controleur.prenom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Volet *</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterVolet || ''}
                  onChange={(e) => {
                    const voletId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterVolet(voletId);
                  }}
                  required
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

            <div className="flex flex-col gap-4 mt-4">
              <div className="alert alert-info text-xs sm:text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5 sm:w-6 sm:h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <div className="font-bold">Données des rubriques</div>
                  <div>Si les colonnes &quot;Critères / Indicateurs&quot; et &quot;Mode de vérification&quot; sont vides dans l&apos;export, cliquez sur le bouton ci-dessous pour charger les données depuis synthese.xlsx</div>
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  className="btn btn-outline text-sm sm:text-base"
                  onClick={handleUpdateRubriques}
                  disabled={isUpdatingRubriques}
                >
                  {isUpdatingRubriques ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Chargement...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2" size={16} />
                      Charger les données des rubriques
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'controleurs' && (
        <div className="space-y-4">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title mb-4 text-lg sm:text-xl">Statistiques des Contrôleurs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Ville *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterVille || ''}
                    onChange={(e) => {
                      const villeId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterVille(villeId);
                      setFilterEtablissement(null);
                      setFilterPeriode(null);
                    }}
                  >
                    <option value="">Sélectionner une ville</option>
                    {villes.map((ville) => (
                      <option key={ville.id} value={ville.id}>
                        {ville.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Établissement *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterEtablissement || ''}
                    onChange={(e) => {
                      const etabId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterEtablissement(etabId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner un établissement</option>
                    {etablissements.map((etab) => (
                      <option key={etab.id} value={etab.id}>
                        {etab.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Période *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterPeriode || ''}
                    onChange={(e) => {
                      const periodeId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterPeriode(periodeId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner une période</option>
                    {periodes.map((periode) => (
                      <option key={periode.id} value={periode.id}>
                        {periode.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Volet *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterVolet || ''}
                    onChange={(e) => {
                      const voletId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterVolet(voletId);
                    }}
                    required
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

          {loadingStats ? (
            <div className="flex justify-center items-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : controleursStats ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-4 sm:p-6">
                <div className="stats stats-vertical sm:stats-horizontal shadow w-full mb-4">
                  <div className="stat">
                    <div className="stat-title text-xs sm:text-sm">Total</div>
                    <div className="stat-value text-2xl sm:text-3xl">{controleursStats.total}</div>
                    <div className="stat-desc text-xs sm:text-sm">Contrôleurs</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-xs sm:text-sm">Avec évaluations</div>
                    <div className="stat-value text-2xl sm:text-3xl text-success">{controleursStats.avec_evaluations.nombre}</div>
                    <div className="stat-desc text-xs sm:text-sm">Contrôleurs</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-xs sm:text-sm">Sans évaluations</div>
                    <div className="stat-value text-2xl sm:text-3xl text-error">{controleursStats.sans_evaluations.nombre}</div>
                    <div className="stat-desc text-xs sm:text-sm">Contrôleurs</div>
                  </div>
                </div>

                {controleursStats.avec_evaluations.nombre > 0 && (
                  <div className="mb-4">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost mb-2"
                      onClick={() => setShowControleursAvecEvaluations(!showControleursAvecEvaluations)}
                    >
                      {showControleursAvecEvaluations ? 'Masquer' : 'Afficher'} les contrôleurs ayant soumis ({controleursStats.avec_evaluations.nombre})
                    </button>
                    {showControleursAvecEvaluations && (
                      <div className="overflow-x-auto">
                        <table className="table table-zebra w-full text-xs sm:text-sm">
                          <thead>
                            <tr>
                              <th>Nom</th>
                              <th className="hidden sm:table-cell">Volets évalués</th>
                              <th className="hidden md:table-cell">Dernière soumission</th>
                            </tr>
                          </thead>
                          <tbody>
                            {controleursStats.avec_evaluations.controleurs.map((c) => (
                              <tr key={c.id}>
                                <td>{c.nom_complet}</td>
                                <td className="hidden sm:table-cell">{c.volets_evalues || 0}</td>
                                <td className="hidden md:table-cell">
                                  {c.derniere_soumission ? new Date(c.derniere_soumission).toLocaleDateString('fr-FR') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {controleursStats.sans_evaluations.nombre > 0 && (
                  <div>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost mb-2"
                      onClick={() => setShowControleursSansEvaluations(!showControleursSansEvaluations)}
                    >
                      {showControleursSansEvaluations ? 'Masquer' : 'Afficher'} les contrôleurs n&apos;ayant pas soumis ({controleursStats.sans_evaluations.nombre})
                    </button>
                    {showControleursSansEvaluations && (
                      <div className="overflow-x-auto">
                        <table className="table table-zebra w-full text-xs sm:text-sm">
                          <thead>
                            <tr>
                              <th>Nom</th>
                            </tr>
                          </thead>
                          <tbody>
                            {controleursStats.sans_evaluations.controleurs.map((c) => (
                              <tr key={c.id}>
                                <td>{c.nom_complet}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <span>Sélectionnez une ville, un établissement, une période et un volet pour voir les statistiques</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title mb-4 text-lg sm:text-xl">Évaluation Détaillée</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Ville *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterVille || ''}
                    onChange={(e) => {
                      const villeId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterVille(villeId);
                      setFilterEtablissement(null);
                      setFilterPeriode(null);
                      setFilterControleur(null);
                    }}
                  >
                    <option value="">Sélectionner une ville</option>
                    {villes.map((ville) => (
                      <option key={ville.id} value={ville.id}>
                        {ville.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Établissement *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterEtablissement || ''}
                    onChange={(e) => {
                      const etabId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterEtablissement(etabId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner un établissement</option>
                    {etablissements.map((etab) => (
                      <option key={etab.id} value={etab.id}>
                        {etab.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Période *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterPeriode || ''}
                    onChange={(e) => {
                      const periodeId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterPeriode(periodeId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner une période</option>
                    {periodes.map((periode) => (
                      <option key={periode.id} value={periode.id}>
                        {periode.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Contrôleur *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterControleur || ''}
                    onChange={(e) => {
                      const controleurId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterControleur(controleurId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner un contrôleur</option>
                    {controleurs.map((controleur) => (
                      <option key={controleur.id} value={controleur.id}>
                        {controleur.nom} {controleur.prenom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Volet *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterVolet || ''}
                    onChange={(e) => {
                      const voletId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterVolet(voletId);
                    }}
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

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  onClick={loadEvaluationDetail}
                  disabled={loadingEvaluation || !filterControleur || !filterVolet || !filterPeriode || !filterEtablissement || !filterVille}
                >
                  {loadingEvaluation ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Chargement...
                    </>
                  ) : (
                    <>
                      <Eye className="inline mr-2" size={16} />
                      Voir l&apos;évaluation
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  onClick={() => handleDeleteEvaluation(false)}
                  disabled={!filterControleur || !filterVolet || !filterPeriode || !filterEtablissement || !filterVille}
                >
                  <Trash2 className="inline mr-2" size={16} />
                  Supprimer cette évaluation
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title mb-4 text-lg sm:text-xl text-error">Zone de danger</h2>
              <p className="text-sm sm:text-base mb-4">Supprimer toutes les évaluations (action irréversible)</p>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => handleDeleteEvaluation(true)}
              >
                <Trash2 className="mr-2" size={16} />
                Supprimer toutes les évaluations
              </button>
            </div>
          </div>
        </div>
      )}

      {showEvaluationModal && evaluationDetail && evaluationDetail.evaluation && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg sm:text-xl">Évaluation détaillée</h3>
              <button
                type="button"
                className="btn btn-sm btn-circle"
                onClick={() => {
                  setShowEvaluationModal(false);
                  setEvaluationDetail(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm sm:text-base">
                <div>
                  <span className="font-bold">Contrôleur:</span> {evaluationDetail.evaluation.controleur_nom}
                </div>
                <div>
                  <span className="font-bold">Ville:</span> {evaluationDetail.evaluation.ville_nom}
                </div>
                <div>
                  <span className="font-bold">Établissement:</span> {evaluationDetail.evaluation.etablissement_nom}
                </div>
                <div>
                  <span className="font-bold">Volet:</span> {evaluationDetail.evaluation.volet_libelle}
                </div>
                <div>
                  <span className="font-bold">Période:</span> {evaluationDetail.evaluation.periode_libelle}
                </div>
                <div>
                  <span className="font-bold">Date d&apos;évaluation:</span>{' '}
                  {new Date(evaluationDetail.evaluation.date_evaluation).toLocaleDateString('fr-FR')}
                </div>
                <div className="sm:col-span-2">
                  <span className="font-bold">Date de soumission:</span>{' '}
                  {new Date(evaluationDetail.evaluation.date_soumission).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="divider"></div>

              <div className="overflow-x-auto">
                <table className="table table-zebra w-full text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Libellé</th>
                      <th className="hidden md:table-cell">Composante</th>
                      <th className="hidden lg:table-cell">Critères</th>
                      <th className="hidden lg:table-cell">Mode vérif.</th>
                      <th>Note</th>
                      <th className="hidden sm:table-cell">Commentaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationDetail.rubriques.map((r) => (
                      <tr key={r.rubrique_id}>
                        <td>{r.numero}</td>
                        <td className="max-w-xs truncate">{r.libelle}</td>
                        <td className="hidden md:table-cell max-w-xs truncate">{r.composante_evaluee || '-'}</td>
                        <td className="hidden lg:table-cell max-w-xs truncate">{r.criteres_indicateurs || '-'}</td>
                        <td className="hidden lg:table-cell max-w-xs truncate">{r.mode_verification || '-'}</td>
                        <td className="font-bold">{r.note}</td>
                        <td className="hidden sm:table-cell max-w-xs truncate">{r.commentaire || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm sm:text-base"
                  onClick={handleExportEvaluation}
                >
                  <Download className="inline mr-2" size={16} />
                  Exporter en Excel
                </button>
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors text-sm sm:text-base"
                  onClick={() => handleDeleteEvaluation(false)}
                >
                  <Trash2 className="inline mr-2" size={16} />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowEvaluationModal(false);
            setEvaluationDetail(null);
          }}></div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4 text-lg sm:text-xl">Mode Maintenance</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-base sm:text-lg">
                  Statut actuel:{' '}
                  <span className={maintenanceMode ? 'text-error font-bold' : 'text-success font-bold'}>
                    {maintenanceMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                  </span>
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">
                  En mode maintenance, seuls les administrateurs peuvent accéder à la plateforme.
                </p>
              </div>
              <button
                type="button"
                className={`btn ${maintenanceMode ? 'btn-error' : 'btn-success'}`}
                onClick={toggleMaintenance}
              >
                {maintenanceMode ? 'Désactiver' : 'Activer'} la maintenance
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4 text-lg sm:text-xl">Gestion des Utilisateurs</h2>
            <p className="text-sm sm:text-base text-gray-400 mb-4">
              Interface de gestion des utilisateurs en cours de développement...
            </p>
            <div className="alert alert-info">
              <Shield size={20} />
              <span className="text-xs sm:text-sm">
                Fonctionnalité de gestion des utilisateurs à implémenter :
                création, édition, désactivation, attribution de rôles
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'referentiels' && <ReferentielsManagement 
        villes={villes}
        setVilles={setVilles}
        getAuthHeaders={getAuthHeaders}
        loadSyntheseData={loadSyntheseData}
      />}

      {activeTab === 'restore' && <RestoreManagement 
        getAuthHeaders={getAuthHeaders}
      />}
    </div>
  );
}

// Composant de restauration des éléments supprimés
interface RestoreManagementProps {
  getAuthHeaders: () => HeadersInit;
}

function RestoreManagement({ getAuthHeaders }: RestoreManagementProps) {
  const [restoreTab, setRestoreTab] = useState<'villes' | 'etablissements' | 'controleurs' | 'periodes' | 'missions' | 'evaluations'>('villes');
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDeletedItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreTab]);

  const loadDeletedItems = async () => {
    setLoading(true);
    try {
      let url = '';
      switch (restoreTab) {
        case 'villes':
          url = '/api/villes?includeDeleted=true';
          break;
        case 'etablissements':
          url = '/api/etablissements?includeDeleted=true';
          break;
        case 'controleurs':
          url = '/api/controleurs?includeDeleted=true';
          break;
        case 'periodes':
          url = '/api/periodes?includeDeleted=true';
          break;
        case 'missions':
          url = '/api/missions?includeDeleted=true';
          break;
        case 'evaluations':
          url = '/api/admin/evaluations?includeDeleted=true';
          break;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      // Filtrer uniquement les éléments supprimés
      if (restoreTab === 'villes') {
        setDeletedItems((data.villes || []).filter((item: any) => item.deleted_at));
      } else if (restoreTab === 'etablissements') {
        setDeletedItems((data.etablissements || []).filter((item: any) => item.deleted_at));
      } else if (restoreTab === 'controleurs') {
        setDeletedItems((data.controleurs || []).filter((item: any) => item.deleted_at));
      } else if (restoreTab === 'periodes') {
        setDeletedItems((data.periodes || []).filter((item: any) => item.deleted_at));
      } else if (restoreTab === 'missions') {
        setDeletedItems((data.missions || []).filter((item: any) => item.deleted_at));
      }
    } catch (error) {
      console.error('Error loading deleted items:', error);
      toast.error('Erreur lors du chargement des éléments supprimés');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir restaurer cet élément ?')) return;

    try {
      let url = '';
      switch (restoreTab) {
        case 'villes':
          url = '/api/villes/restore';
          break;
        case 'etablissements':
          url = '/api/etablissements/restore';
          break;
        case 'controleurs':
          url = '/api/controleurs/restore';
          break;
        case 'periodes':
          url = '/api/periodes/restore';
          break;
        case 'missions':
          url = '/api/missions/restore';
          break;
        case 'evaluations':
          url = '/api/admin/evaluations/restore';
          break;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');

      toast.success(data.message || 'Élément restauré avec succès');
      await loadDeletedItems();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la restauration');
    }
  };

  const getTableHeaders = () => {
    switch (restoreTab) {
      case 'villes':
        return ['ID', 'Nom', 'Date de suppression', 'Actions'];
      case 'etablissements':
        return ['ID', 'Nom', 'Ville', 'Date de suppression', 'Actions'];
      case 'controleurs':
        return ['ID', 'Nom', 'Prénom', 'Ville', 'Date de suppression', 'Actions'];
      case 'periodes':
        return ['ID', 'Libellé', 'Date début', 'Date fin', 'Date de suppression', 'Actions'];
      case 'missions':
        return ['ID', 'Nom', 'Date début', 'Date fin', 'Date de suppression', 'Actions'];
      default:
        return ['ID', 'Date de suppression', 'Actions'];
    }
  };

  const renderTableRow = (item: any) => {
    switch (restoreTab) {
      case 'villes':
        return (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>{item.nom}</td>
            <td>{new Date(item.deleted_at).toLocaleString('fr-FR')}</td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => handleRestore(item.id)}
              >
                Restaurer
              </button>
            </td>
          </tr>
        );
      case 'etablissements':
        return (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>{item.nom}</td>
            <td>{item.ville_nom || item.ville_id}</td>
            <td>{new Date(item.deleted_at).toLocaleString('fr-FR')}</td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => handleRestore(item.id)}
              >
                Restaurer
              </button>
            </td>
          </tr>
        );
      case 'controleurs':
        return (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>{item.nom}</td>
            <td>{item.prenom}</td>
            <td>{item.ville_id}</td>
            <td>{new Date(item.deleted_at).toLocaleString('fr-FR')}</td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => handleRestore(item.id)}
              >
                Restaurer
              </button>
            </td>
          </tr>
        );
      case 'periodes':
        return (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>{item.libelle}</td>
            <td>{new Date(item.date_debut).toLocaleDateString('fr-FR')}</td>
            <td>{new Date(item.date_fin).toLocaleDateString('fr-FR')}</td>
            <td>{new Date(item.deleted_at).toLocaleString('fr-FR')}</td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => handleRestore(item.id)}
              >
                Restaurer
              </button>
            </td>
          </tr>
        );
      case 'missions':
        return (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>{item.nom}</td>
            <td>{new Date(item.date_debut).toLocaleDateString('fr-FR')}</td>
            <td>{new Date(item.date_fin).toLocaleDateString('fr-FR')}</td>
            <td>{new Date(item.deleted_at).toLocaleString('fr-FR')}</td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => handleRestore(item.id)}
              >
                Restaurer
              </button>
            </td>
          </tr>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title mb-4 text-lg sm:text-xl">Restauration des Éléments Supprimés</h2>
          
          <div className="tabs tabs-boxed mb-4">
            <button
              type="button"
              className={`tab ${restoreTab === 'villes' ? 'tab-active' : ''}`}
              onClick={() => setRestoreTab('villes')}
            >
              Villes
            </button>
            <button
              type="button"
              className={`tab ${restoreTab === 'etablissements' ? 'tab-active' : ''}`}
              onClick={() => setRestoreTab('etablissements')}
            >
              Établissements
            </button>
            <button
              type="button"
              className={`tab ${restoreTab === 'controleurs' ? 'tab-active' : ''}`}
              onClick={() => setRestoreTab('controleurs')}
            >
              Contrôleurs
            </button>
            <button
              type="button"
              className={`tab ${restoreTab === 'periodes' ? 'tab-active' : ''}`}
              onClick={() => setRestoreTab('periodes')}
            >
              Périodes
            </button>
            <button
              type="button"
              className={`tab ${restoreTab === 'missions' ? 'tab-active' : ''}`}
              onClick={() => setRestoreTab('missions')}
            >
              Missions
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : deletedItems.length === 0 ? (
            <div className="alert alert-info">
              <span>Aucun élément supprimé trouvé pour cette catégorie.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    {getTableHeaders().map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deletedItems.map((item) => renderTableRow(item))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant de gestion des référentiels
interface ReferentielsManagementProps {
  villes: Ville[];
  setVilles: (villes: Ville[]) => void;
  getAuthHeaders: () => HeadersInit;
  loadSyntheseData: () => Promise<void>;
}

function ReferentielsManagement({ villes, setVilles, getAuthHeaders, loadSyntheseData }: ReferentielsManagementProps) {
  const [referentielTab, setReferentielTab] = useState<'villes' | 'etablissements' | 'controleurs' | 'periodes' | 'missions'>('villes');
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [controleurs, setControleurs] = useState<Controleur[]>([]);
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  
  // États pour les formulaires
  const [showVilleForm, setShowVilleForm] = useState(false);
  const [editingVille, setEditingVille] = useState<Ville | null>(null);
  const [villeFormData, setVilleFormData] = useState({ nom: '' });
  
  const [showEtablissementForm, setShowEtablissementForm] = useState(false);
  const [editingEtablissement, setEditingEtablissement] = useState<Etablissement | null>(null);
  const [etablissementFormData, setEtablissementFormData] = useState({ nom: '', villeId: 0 });
  
  const [showControleurForm, setShowControleurForm] = useState(false);
  const [editingControleur, setEditingControleur] = useState<Controleur | null>(null);
  const [controleurFormData, setControleurFormData] = useState({ nom: '', prenom: '', villeId: 0 });
  
  const [showPeriodeForm, setShowPeriodeForm] = useState(false);
  const [editingPeriode, setEditingPeriode] = useState<Periode | null>(null);
  const [periodeFormData, setPeriodeFormData] = useState({ libelle: '', date_debut: '', date_fin: '', villeId: 0 });
  
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [editingMission, setEditingMission] = useState<any | null>(null);
  const [missionFormData, setMissionFormData] = useState({ nom: '', date_debut: '', date_fin: '' });

  // Charger les données
  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referentielTab]);

  const loadAllData = async () => {
    try {
      if (referentielTab === 'etablissements' || referentielTab === 'controleurs' || referentielTab === 'periodes') {
        // Charger toutes les villes pour les filtres
        const villesRes = await fetch('/api/villes');
        const villesData = await villesRes.json();
        setVilles(villesData.villes || []);
      }
      
      if (referentielTab === 'etablissements') {
        const res = await fetch('/api/etablissements');
        const data = await res.json();
        setEtablissements(data.etablissements || []);
      } else if (referentielTab === 'controleurs') {
        const res = await fetch('/api/controleurs');
        const data = await res.json();
        setControleurs(data.controleurs || []);
      } else if (referentielTab === 'periodes') {
        const res = await fetch('/api/periodes');
        const data = await res.json();
        setPeriodes(data.periodes || []);
      } else if (referentielTab === 'missions') {
        const res = await fetch('/api/missions');
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    }
  };

  // Gestion des villes
  const handleVilleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingVille ? '/api/villes' : '/api/villes';
      const method = editingVille ? 'PATCH' : 'POST';
      const body = editingVille ? { id: editingVille.id, ...villeFormData } : villeFormData;
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      
      toast.success(editingVille ? 'Ville modifiée avec succès' : 'Ville créée avec succès');
      setShowVilleForm(false);
      setEditingVille(null);
      setVilleFormData({ nom: '' });
      await loadSyntheseData();
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteVille = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ville ?')) return;
    try {
      const response = await fetch(`/api/villes?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      toast.success('Ville supprimée avec succès');
      await loadSyntheseData();
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Gestion des établissements
  const handleEtablissementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/etablissements';
      const method = editingEtablissement ? 'PATCH' : 'POST';
      const body = editingEtablissement 
        ? { id: editingEtablissement.id, nom: etablissementFormData.nom, villeId: etablissementFormData.villeId }
        : { nom: etablissementFormData.nom, villeId: etablissementFormData.villeId };
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      
      toast.success(editingEtablissement ? 'Établissement modifié avec succès' : 'Établissement créé avec succès');
      setShowEtablissementForm(false);
      setEditingEtablissement(null);
      setEtablissementFormData({ nom: '', villeId: 0 });
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteEtablissement = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet établissement ?')) return;
    try {
      const response = await fetch(`/api/etablissements?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      toast.success('Établissement supprimé avec succès');
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Gestion des contrôleurs
  const handleControleurSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/controleurs';
      const method = editingControleur ? 'PATCH' : 'POST';
      const body = editingControleur
        ? { id: editingControleur.id, nom: controleurFormData.nom, prenom: controleurFormData.prenom, villeId: controleurFormData.villeId }
        : { nom: controleurFormData.nom, prenom: controleurFormData.prenom, villeId: controleurFormData.villeId };
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      
      toast.success(editingControleur ? 'Contrôleur modifié avec succès' : 'Contrôleur créé avec succès');
      setShowControleurForm(false);
      setEditingControleur(null);
      setControleurFormData({ nom: '', prenom: '', villeId: 0 });
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteControleur = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contrôleur ?')) return;
    try {
      const response = await fetch(`/api/controleurs?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      toast.success('Contrôleur supprimé avec succès');
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Gestion des périodes
  const handlePeriodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/periodes';
      const method = editingPeriode ? 'PATCH' : 'POST';
      const body = editingPeriode
        ? { id: editingPeriode.id, libelle: periodeFormData.libelle, date_debut: periodeFormData.date_debut, date_fin: periodeFormData.date_fin, villeId: periodeFormData.villeId }
        : { libelle: periodeFormData.libelle, date_debut: periodeFormData.date_debut, date_fin: periodeFormData.date_fin, villeId: periodeFormData.villeId };
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      
      toast.success(editingPeriode ? 'Période modifiée avec succès' : 'Période créée avec succès');
      setShowPeriodeForm(false);
      setEditingPeriode(null);
      setPeriodeFormData({ libelle: '', date_debut: '', date_fin: '', villeId: 0 });
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeletePeriode = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette période ?')) return;
    try {
      const response = await fetch(`/api/periodes?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      toast.success('Période supprimée avec succès');
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Gestion des missions
  const handleMissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/missions';
      const method = editingMission ? 'PATCH' : 'POST';
      const body = editingMission
        ? { id: editingMission.id, nom: missionFormData.nom, date_debut: missionFormData.date_debut, date_fin: missionFormData.date_fin }
        : { nom: missionFormData.nom, date_debut: missionFormData.date_debut, date_fin: missionFormData.date_fin };
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      
      toast.success(editingMission ? 'Mission modifiée avec succès' : 'Mission créée avec succès');
      setShowMissionForm(false);
      setEditingMission(null);
      setMissionFormData({ nom: '', date_debut: '', date_fin: '' });
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteMission = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) return;
    try {
      const response = await fetch(`/api/missions?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      toast.success('Mission supprimée avec succès');
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title mb-4 text-lg sm:text-xl">Gestion des Référentiels</h2>
          
          <div className="tabs tabs-boxed mb-4">
            <button
              type="button"
              className={`tab ${referentielTab === 'villes' ? 'tab-active' : ''}`}
              onClick={() => setReferentielTab('villes')}
            >
              <Building2 className="mr-2" size={16} />
              Villes
            </button>
            <button
              type="button"
              className={`tab ${referentielTab === 'etablissements' ? 'tab-active' : ''}`}
              onClick={() => setReferentielTab('etablissements')}
            >
              <Building2 className="mr-2" size={16} />
              Établissements
            </button>
            <button
              type="button"
              className={`tab ${referentielTab === 'controleurs' ? 'tab-active' : ''}`}
              onClick={() => setReferentielTab('controleurs')}
            >
              <UserCheck className="mr-2" size={16} />
              Contrôleurs
            </button>
            <button
              type="button"
              className={`tab ${referentielTab === 'periodes' ? 'tab-active' : ''}`}
              onClick={() => setReferentielTab('periodes')}
            >
              <Calendar className="mr-2" size={16} />
              Périodes
            </button>
            <button
              type="button"
              className={`tab ${referentielTab === 'missions' ? 'tab-active' : ''}`}
              onClick={() => setReferentielTab('missions')}
            >
              <Calendar className="mr-2" size={16} />
              Missions
            </button>
          </div>

          {/* Gestion des Villes */}
          {referentielTab === 'villes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Villes</h3>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingVille(null);
                    setVilleFormData({ nom: '' });
                    setShowVilleForm(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Ajouter une ville
                </button>
              </div>
              
              {showVilleForm && (
                <div className="card bg-base-200 mb-4">
                  <div className="card-body">
                    <h4 className="card-title text-sm">{editingVille ? 'Modifier' : 'Créer'} une ville</h4>
                    <form onSubmit={handleVilleSubmit}>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Nom de la ville</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered"
                          value={villeFormData.nom}
                          onChange={(e) => setVilleFormData({ nom: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary btn-sm">
                          {editingVille ? 'Modifier' : 'Créer'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setShowVilleForm(false);
                            setEditingVille(null);
                            setVilleFormData({ nom: '' });
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {villes.map((ville) => (
                      <tr key={ville.id}>
                        <td>{ville.id}</td>
                        <td>{ville.nom}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => {
                                setEditingVille(ville);
                                setVilleFormData({ nom: ville.nom });
                                setShowVilleForm(true);
                              }}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-error"
                              onClick={() => handleDeleteVille(ville.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gestion des Établissements */}
          {referentielTab === 'etablissements' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Établissements</h3>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingEtablissement(null);
                    setEtablissementFormData({ nom: '', villeId: villes[0]?.id || 0 });
                    setShowEtablissementForm(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Ajouter un établissement
                </button>
              </div>
              
              {showEtablissementForm && (
                <div className="card bg-base-200 mb-4">
                  <div className="card-body">
                    <h4 className="card-title text-sm">{editingEtablissement ? 'Modifier' : 'Créer'} un établissement</h4>
                    <form onSubmit={handleEtablissementSubmit}>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Ville</span>
                        </label>
                        <select
                          className="select select-bordered"
                          value={etablissementFormData.villeId}
                          onChange={(e) => setEtablissementFormData({ ...etablissementFormData, villeId: parseInt(e.target.value) })}
                          required
                        >
                          <option value={0}>Sélectionner une ville</option>
                          {villes.map((ville) => (
                            <option key={ville.id} value={ville.id}>
                              {ville.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Nom de l&apos;établissement</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered"
                          value={etablissementFormData.nom}
                          onChange={(e) => setEtablissementFormData({ ...etablissementFormData, nom: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary btn-sm">
                          {editingEtablissement ? 'Modifier' : 'Créer'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setShowEtablissementForm(false);
                            setEditingEtablissement(null);
                            setEtablissementFormData({ nom: '', villeId: 0 });
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Ville</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {etablissements.map((etab) => {
                      const ville = villes.find((v) => v.id === etab.ville_id);
                      return (
                        <tr key={etab.id}>
                          <td>{etab.id}</td>
                          <td>{etab.nom}</td>
                          <td>{ville?.nom || etab.ville_id}</td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => {
                                  setEditingEtablissement(etab);
                                  setEtablissementFormData({ nom: etab.nom, villeId: etab.ville_id });
                                  setShowEtablissementForm(true);
                                }}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-error"
                                onClick={() => handleDeleteEtablissement(etab.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gestion des Contrôleurs */}
          {referentielTab === 'controleurs' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Contrôleurs</h3>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingControleur(null);
                    setControleurFormData({ nom: '', prenom: '', villeId: villes[0]?.id || 0 });
                    setShowControleurForm(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Ajouter un contrôleur
                </button>
              </div>
              
              {showControleurForm && (
                <div className="card bg-base-200 mb-4">
                  <div className="card-body">
                    <h4 className="card-title text-sm">{editingControleur ? 'Modifier' : 'Créer'} un contrôleur</h4>
                    <form onSubmit={handleControleurSubmit}>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Ville</span>
                        </label>
                        <select
                          className="select select-bordered"
                          value={controleurFormData.villeId}
                          onChange={(e) => setControleurFormData({ ...controleurFormData, villeId: parseInt(e.target.value) })}
                          required
                        >
                          <option value={0}>Sélectionner une ville</option>
                          {villes.map((ville) => (
                            <option key={ville.id} value={ville.id}>
                              {ville.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Nom</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered"
                          value={controleurFormData.nom}
                          onChange={(e) => setControleurFormData({ ...controleurFormData, nom: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Prénom</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered"
                          value={controleurFormData.prenom}
                          onChange={(e) => setControleurFormData({ ...controleurFormData, prenom: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary btn-sm">
                          {editingControleur ? 'Modifier' : 'Créer'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setShowControleurForm(false);
                            setEditingControleur(null);
                            setControleurFormData({ nom: '', prenom: '', villeId: 0 });
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Prénom</th>
                      <th>Ville</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {controleurs.map((controleur) => {
                      const ville = villes.find((v) => v.id === controleur.ville_id);
                      return (
                        <tr key={controleur.id}>
                          <td>{controleur.id}</td>
                          <td>{controleur.nom}</td>
                          <td>{controleur.prenom}</td>
                          <td>{ville?.nom || controleur.ville_id}</td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => {
                                  setEditingControleur(controleur);
                                  setControleurFormData({ nom: controleur.nom, prenom: controleur.prenom, villeId: controleur.ville_id });
                                  setShowControleurForm(true);
                                }}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-error"
                                onClick={() => handleDeleteControleur(controleur.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gestion des Périodes */}
          {referentielTab === 'periodes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Périodes</h3>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingPeriode(null);
                    setPeriodeFormData({ libelle: '', date_debut: '', date_fin: '', villeId: villes[0]?.id || 0 });
                    setShowPeriodeForm(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Ajouter une période
                </button>
              </div>
              
              {showPeriodeForm && (
                <div className="card bg-base-200 mb-4">
                  <div className="card-body">
                    <h4 className="card-title text-sm">{editingPeriode ? 'Modifier' : 'Créer'} une période</h4>
                    <form onSubmit={handlePeriodeSubmit}>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Ville</span>
                        </label>
                        <select
                          className="select select-bordered"
                          value={periodeFormData.villeId}
                          onChange={(e) => setPeriodeFormData({ ...periodeFormData, villeId: parseInt(e.target.value) })}
                          required
                        >
                          <option value={0}>Sélectionner une ville</option>
                          {villes.map((ville) => (
                            <option key={ville.id} value={ville.id}>
                              {ville.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Libellé</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered"
                          value={periodeFormData.libelle}
                          onChange={(e) => setPeriodeFormData({ ...periodeFormData, libelle: e.target.value })}
                          placeholder="Ex: Du 17/11/2025 au 21/11/2025"
                          required
                        />
                      </div>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Date de début</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered"
                          value={periodeFormData.date_debut}
                          onChange={(e) => setPeriodeFormData({ ...periodeFormData, date_debut: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Date de fin</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered"
                          value={periodeFormData.date_fin}
                          onChange={(e) => setPeriodeFormData({ ...periodeFormData, date_fin: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary btn-sm">
                          {editingPeriode ? 'Modifier' : 'Créer'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setShowPeriodeForm(false);
                            setEditingPeriode(null);
                            setPeriodeFormData({ libelle: '', date_debut: '', date_fin: '', villeId: 0 });
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Libellé</th>
                      <th>Date début</th>
                      <th>Date fin</th>
                      <th>Ville</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodes.map((periode) => {
                      const ville = villes.find((v) => v.id === periode.ville_id);
                      return (
                        <tr key={periode.id}>
                          <td>{periode.id}</td>
                          <td>{periode.libelle}</td>
                          <td>{new Date(periode.date_debut).toLocaleDateString('fr-FR')}</td>
                          <td>{new Date(periode.date_fin).toLocaleDateString('fr-FR')}</td>
                          <td>{ville?.nom || periode.ville_id}</td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => {
                                  setEditingPeriode(periode);
                                  setPeriodeFormData({ 
                                    libelle: periode.libelle, 
                                    date_debut: periode.date_debut, 
                                    date_fin: periode.date_fin, 
                                    villeId: periode.ville_id 
                                  });
                                  setShowPeriodeForm(true);
                                }}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-error"
                                onClick={() => handleDeletePeriode(periode.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gestion des Missions */}
          {referentielTab === 'missions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Missions</h3>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingMission(null);
                    setMissionFormData({ nom: '', date_debut: '', date_fin: '' });
                    setShowMissionForm(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Ajouter une mission
                </button>
              </div>
              
              {showMissionForm && (
                <div className="card bg-base-200 mb-4">
                  <div className="card-body">
                    <h4 className="card-title text-sm">{editingMission ? 'Modifier' : 'Créer'} une mission</h4>
                    <form onSubmit={handleMissionSubmit}>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Nom de la mission</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered"
                          value={missionFormData.nom}
                          onChange={(e) => setMissionFormData({ ...missionFormData, nom: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Date de début</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered"
                          value={missionFormData.date_debut}
                          onChange={(e) => setMissionFormData({ ...missionFormData, date_debut: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-control mb-2">
                        <label className="label">
                          <span className="label-text">Date de fin</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered"
                          value={missionFormData.date_fin}
                          onChange={(e) => setMissionFormData({ ...missionFormData, date_fin: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary btn-sm">
                          {editingMission ? 'Modifier' : 'Créer'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setShowMissionForm(false);
                            setEditingMission(null);
                            setMissionFormData({ nom: '', date_debut: '', date_fin: '' });
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Date début</th>
                      <th>Date fin</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missions.map((mission) => (
                      <tr key={mission.id}>
                        <td>{mission.id}</td>
                        <td>{mission.nom}</td>
                        <td>{new Date(mission.date_debut).toLocaleDateString('fr-FR')}</td>
                        <td>{new Date(mission.date_fin).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => {
                                setEditingMission(mission);
                                setMissionFormData({ nom: mission.nom, date_debut: mission.date_debut, date_fin: mission.date_fin });
                                setShowMissionForm(true);
                              }}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-error"
                              onClick={() => handleDeleteMission(mission.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
