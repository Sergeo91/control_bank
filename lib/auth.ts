import { getPool } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: 'admin' | 'superviseur' | 'agent';
  isActive: boolean;
}

export interface Session {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
}

/**
 * Hash un mot de passe avec bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Vérifie un mot de passe
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Génère un token de session sécurisé
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Crée une session pour un utilisateur
 */
export async function createSession(userId: number): Promise<Session> {
  const pool = getPool();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const result = await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, token, expires_at`,
    [userId, token, expiresAt]
  );

  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    token: result.rows[0].token,
    expiresAt: result.rows[0].expires_at,
  };
}

/**
 * Récupère une session par son token
 */
export async function getSessionByToken(token: string): Promise<Session | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, user_id, token, expires_at
     FROM sessions
     WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    token: result.rows[0].token,
    expiresAt: result.rows[0].expires_at,
  };
}

/**
 * Récupère un utilisateur par son ID
 */
export async function getUserById(id: number): Promise<User | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, email, nom, prenom, role, is_active
     FROM users
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    email: result.rows[0].email,
    nom: result.rows[0].nom,
    prenom: result.rows[0].prenom,
    role: result.rows[0].role,
    isActive: result.rows[0].is_active,
  };
}

/**
 * Récupère un utilisateur par son email
 */
export async function getUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, email, password_hash, nom, prenom, role, is_active
     FROM users
     WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    email: result.rows[0].email,
    passwordHash: result.rows[0].password_hash,
    nom: result.rows[0].nom,
    prenom: result.rows[0].prenom,
    role: result.rows[0].role,
    isActive: result.rows[0].is_active,
  };
}

/**
 * Supprime une session (déconnexion)
 */
export async function deleteSession(token: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
}

/**
 * Nettoie les sessions expirées
 */
export async function cleanExpiredSessions(): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
}

/**
 * Vérifie si l'utilisateur a le rôle requis
 */
export function hasRole(user: User | null, requiredRole: 'admin' | 'superviseur' | 'agent'): boolean {
  if (!user || !user.isActive) {
    return false;
  }

  const roleHierarchy: Record<string, number> = {
    agent: 1,
    superviseur: 2,
    admin: 3,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Vérifie si l'utilisateur est admin
 */
export function isAdmin(user: User | null): boolean {
  return hasRole(user, 'admin');
}

/**
 * Vérifie l'authentification à partir d'une requête Next.js
 * Retourne l'utilisateur et la session si authentifié
 */
export async function verifyAuth(request: NextRequest): Promise<{ user: User | null; session: Session | null }> {
  // Récupérer le token depuis différents emplacements possibles
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.nextUrl.searchParams.get('token') ||
                request.cookies.get('session_token')?.value;

  if (!token) {
    return { user: null, session: null };
  }

  const session = await getSessionByToken(token);
  if (!session) {
    return { user: null, session: null };
  }

  const user = await getUserById(session.userId);
  if (!user || !user.isActive) {
    return { user: null, session: null };
  }

  return { user, session };
}

