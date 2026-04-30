-- Migration: Ajout du soft delete (suppression logique)
-- Description: Ajout de la colonne deleted_at pour permettre la restauration des éléments supprimés

-- Ajouter deleted_at à toutes les tables qui peuvent être supprimées
ALTER TABLE ville 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE etablissement_visite 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE controleur 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE periode 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE mission 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE evaluation 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Créer des index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_ville_deleted_at ON ville(deleted_at);
CREATE INDEX IF NOT EXISTS idx_etablissement_visite_deleted_at ON etablissement_visite(deleted_at);
CREATE INDEX IF NOT EXISTS idx_controleur_deleted_at ON controleur(deleted_at);
CREATE INDEX IF NOT EXISTS idx_periode_deleted_at ON periode(deleted_at);
CREATE INDEX IF NOT EXISTS idx_mission_deleted_at ON mission(deleted_at);
CREATE INDEX IF NOT EXISTS idx_evaluation_deleted_at ON evaluation(deleted_at);

