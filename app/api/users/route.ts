import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionByToken, getUserById, isAdmin, hashPassword } from '@/lib/auth';
import { userSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalide' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.userId);
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT id, email, nom, prenom, role, is_active, created_at, updated_at
       FROM users
       ORDER BY nom, prenom`
    );

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalide' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.userId);
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const userData = userSchema.parse(body);

    const passwordHash = await hashPassword(userData.password);

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nom, prenom, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, nom, prenom, role, is_active`,
      [
        userData.email.toLowerCase(),
        passwordHash,
        userData.nom,
        userData.prenom,
        userData.role,
      ]
    );

    return NextResponse.json({ user: result.rows[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 409 }
      );
    }
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalide' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.userId);
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, nom, prenom, role, isActive, password } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    let query = 'UPDATE users SET nom = $1, prenom = $2, role = $3, is_active = $4';
    const params: any[] = [nom, prenom, role, isActive];

    if (password && password.length >= 6) {
      const passwordHash = await hashPassword(password);
      query += ', password_hash = $5';
      params.push(passwordHash);
    }

    query += ', updated_at = NOW() WHERE id = $' + (params.length + 1);
    params.push(id);

    await pool.query(query, params);

    const result = await pool.query(
      'SELECT id, email, nom, prenom, role, is_active FROM users WHERE id = $1',
      [id]
    );

    return NextResponse.json({ user: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur' },
      { status: 500 }
    );
  }
}

