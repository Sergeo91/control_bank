import { getPool } from './db';

/**
 * Vérifie si la plateforme est en mode maintenance
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT value FROM app_settings WHERE key = 'maintenance_mode'`
  );

  if (result.rows.length === 0) {
    return false;
  }

  return result.rows[0].value === 'true';
}

/**
 * Active ou désactive le mode maintenance
 */
export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('maintenance_mode', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [enabled ? 'true' : 'false']
  );
}

