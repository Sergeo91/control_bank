import { getPool } from './db';

// Cache pour éviter de vérifier plusieurs fois
const columnExistsCache: Record<string, boolean> = {};

/**
 * Vérifie si la colonne deleted_at existe dans une table
 */
export async function hasDeletedAtColumn(tableName: string): Promise<boolean> {
  const cacheKey = tableName;
  
  if (cacheKey in columnExistsCache) {
    return columnExistsCache[cacheKey];
  }

  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = 'deleted_at'
    `, [tableName]);
    
    const exists = result.rows.length > 0;
    columnExistsCache[cacheKey] = exists;
    return exists;
  } catch (error) {
    // En cas d'erreur, on assume que la colonne n'existe pas
    columnExistsCache[cacheKey] = false;
    return false;
  }
}

/**
 * Construit une clause WHERE pour exclure les éléments supprimés
 * Retourne une chaîne vide si la colonne deleted_at n'existe pas
 */
export async function getDeletedAtWhereClause(
  tableAlias: string,
  includeDeleted: boolean
): Promise<string> {
  // Extraire le nom de la table depuis l'alias (ou utiliser l'alias directement)
  const tableName = tableAlias.replace(/^[a-z]+\./, '').replace(/^[a-z]+$/, tableAlias);
  
  // Mapping des alias vers les noms de table
  const tableMapping: Record<string, string> = {
    'e': 'etablissement_visite',
    'c': 'controleur',
    'v': 'ville',
    'p': 'periode',
    'ev': 'evaluation',
  };
  
  const actualTableName = tableMapping[tableAlias] || tableAlias;
  const hasColumn = await hasDeletedAtColumn(actualTableName);
  
  if (!hasColumn || includeDeleted) {
    return '';
  }
  
  return `${tableAlias}.deleted_at IS NULL`;
}

