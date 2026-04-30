-- Migration: Ajout des colonnes pour rubriques et création de la table période
-- Description: Ajout des colonnes composante_evaluee, criteres_indicateurs, mode_verification
--              et création de la table periode avec libellés exacts

-- Ajouter les colonnes manquantes à la table rubrique
ALTER TABLE rubrique 
ADD COLUMN IF NOT EXISTS composante_evaluee TEXT,
ADD COLUMN IF NOT EXISTS criteres_indicateurs TEXT,
ADD COLUMN IF NOT EXISTS mode_verification TEXT;

-- Table: periode
-- Stocke les périodes avec les libellés exacts selon la ville
CREATE TABLE IF NOT EXISTS periode (
    id SERIAL PRIMARY KEY,
    ville_id INTEGER NOT NULL REFERENCES ville(id) ON DELETE CASCADE,
    libelle TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ville_id, libelle)
);

CREATE INDEX IF NOT EXISTS idx_periode_ville_id ON periode(ville_id);

-- Insérer les périodes avec les libellés exacts
INSERT INTO periode (ville_id, libelle, date_debut, date_fin)
SELECT id, 'Du 17/11/2025 au 21/11/2025', '2025-11-17', '2025-11-21'
FROM ville WHERE nom = 'NATITINGOU'
ON CONFLICT (ville_id, libelle) DO NOTHING;

INSERT INTO periode (ville_id, libelle, date_debut, date_fin)
SELECT id, 'Du 24/11/2025 au 28/11/2025', '2025-11-24', '2025-11-28'
FROM ville WHERE nom = 'BOHICON'
ON CONFLICT (ville_id, libelle) DO NOTHING;

-- Mettre à jour les libellés des volets selon les spécifications
UPDATE volet SET libelle = 'ÉVALUATION SUR SITE DU FONCTIONNEMENT INTERNE DES BANQUES' WHERE code = 'FI';
UPDATE volet SET libelle = 'ÉVALUATION DE LA QUALITÉ DE SERVICE BANCAIRE' WHERE code = 'F_QS';
UPDATE volet SET libelle = 'ÉVALUATION DE L''ÉTAT DE FONCTIONNEMENT DES GAB/DAB' WHERE code = 'F_GAB';

