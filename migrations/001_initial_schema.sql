-- Migration: Initial Schema
-- Description: Création des tables pour la plateforme d'évaluation des banques

-- Table: ville
CREATE TABLE IF NOT EXISTS ville (
    id SERIAL PRIMARY KEY,
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ville_nom ON ville(nom);

-- Insérer les villes par défaut
INSERT INTO ville (nom) VALUES 
    ('NATITINGOU'),
    ('BOHICON')
ON CONFLICT (nom) DO NOTHING;

-- Table: etablissement_visite
CREATE TABLE IF NOT EXISTS etablissement_visite (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    ville_id INTEGER NOT NULL REFERENCES ville(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nom, ville_id)
);

CREATE INDEX IF NOT EXISTS idx_etablissement_visite_ville_id ON etablissement_visite(ville_id);
CREATE INDEX IF NOT EXISTS idx_etablissement_visite_nom ON etablissement_visite(nom);

-- Table: controleur
CREATE TABLE IF NOT EXISTS controleur (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    ville_id INTEGER NOT NULL REFERENCES ville(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nom, prenom, ville_id)
);

CREATE INDEX IF NOT EXISTS idx_controleur_ville_id ON controleur(ville_id);
CREATE INDEX IF NOT EXISTS idx_controleur_nom ON controleur(nom);

-- Insérer les contrôleurs par défaut
-- NATITINGOU
INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'ATCHEDE', 'Jacques', id FROM ville WHERE nom = 'NATITINGOU'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'KOMBETTO', 'Thierry Q.', id FROM ville WHERE nom = 'NATITINGOU'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'SALIFOU', 'Rhamatou', id FROM ville WHERE nom = 'NATITINGOU'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'LOBIYI', 'Marthe', id FROM ville WHERE nom = 'NATITINGOU'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'ZOHOUN', 'M. Alexandre', id FROM ville WHERE nom = 'NATITINGOU'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

-- BOHICON
INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'ATCHEDE', 'Jacques', id FROM ville WHERE nom = 'BOHICON'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'KOMBETTO', 'Thierry Q.', id FROM ville WHERE nom = 'BOHICON'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'DONHOSSOU', 'Eurace B.', id FROM ville WHERE nom = 'BOHICON'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'LOBIYI', 'Marthe', id FROM ville WHERE nom = 'BOHICON'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

INSERT INTO controleur (nom, prenom, ville_id) 
SELECT 'HOUNNOUKON', 'Cress Georges', id FROM ville WHERE nom = 'BOHICON'
ON CONFLICT (nom, prenom, ville_id) DO NOTHING;

-- Table: mission
CREATE TABLE IF NOT EXISTS mission (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (date_fin >= date_debut)
);

CREATE INDEX IF NOT EXISTS idx_mission_dates ON mission(date_debut, date_fin);

-- Table: volet
CREATE TABLE IF NOT EXISTS volet (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    libelle TEXT NOT NULL,
    ordre INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les 3 volets
INSERT INTO volet (code, libelle, ordre) VALUES 
    ('FI', 'Fonctionnement Interne', 1),
    ('F_QS', 'Qualité de Service', 2),
    ('F_GAB', 'GAB', 3)
ON CONFLICT (code) DO NOTHING;

-- Table: rubrique
CREATE TABLE IF NOT EXISTS rubrique (
    id SERIAL PRIMARY KEY,
    volet_id INTEGER NOT NULL REFERENCES volet(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL CHECK (numero >= 1 AND numero <= 12),
    libelle TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(volet_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_rubrique_volet_id ON rubrique(volet_id);
CREATE INDEX IF NOT EXISTS idx_rubrique_numero ON rubrique(numero);

-- Table: barème (définition des notes 1 à 5)
CREATE TABLE IF NOT EXISTS bareme (
    id SERIAL PRIMARY KEY,
    note INTEGER UNIQUE NOT NULL CHECK (note >= 1 AND note <= 5),
    libelle TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer le barème par défaut
INSERT INTO bareme (note, libelle, description) VALUES 
    (1, 'Très insuffisant', 'Performance très en dessous des attentes'),
    (2, 'Insuffisant', 'Performance en dessous des attentes'),
    (3, 'Acceptable', 'Performance conforme aux attentes minimales'),
    (4, 'Bien', 'Performance au-dessus des attentes'),
    (5, 'Très bien', 'Performance excellente, dépasse largement les attentes')
ON CONFLICT (note) DO NOTHING;

-- Table: evaluation
CREATE TABLE IF NOT EXISTS evaluation (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER NOT NULL REFERENCES mission(id) ON DELETE RESTRICT,
    ville_id INTEGER NOT NULL REFERENCES ville(id) ON DELETE RESTRICT,
    etablissement_visite_id INTEGER NOT NULL REFERENCES etablissement_visite(id) ON DELETE RESTRICT,
    controleur_id INTEGER NOT NULL REFERENCES controleur(id) ON DELETE RESTRICT,
    volet_id INTEGER NOT NULL REFERENCES volet(id) ON DELETE RESTRICT,
    rubrique_id INTEGER NOT NULL REFERENCES rubrique(id) ON DELETE RESTRICT,
    note INTEGER NOT NULL CHECK (note >= 1 AND note <= 5),
    commentaire TEXT,
    date_evaluation DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_mission_id ON evaluation(mission_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_ville_id ON evaluation(ville_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_etablissement_id ON evaluation(etablissement_visite_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_controleur_id ON evaluation(controleur_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_volet_id ON evaluation(volet_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_rubrique_id ON evaluation(rubrique_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_date ON evaluation(date_evaluation);
