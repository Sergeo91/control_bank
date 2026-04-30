import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword, createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { isMaintenanceMode } from '@/lib/maintenance';

export async function POST(request: NextRequest) {
  try {
    // Vérifier le mode maintenance
    const maintenance = await isMaintenanceMode();
    if (maintenance) {
      return NextResponse.json(
        { error: 'La plateforme est en maintenance' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Récupérer l'utilisateur
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Votre compte est désactivé' },
        { status: 403 }
      );
    }

    // Vérifier le mot de passe
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Créer une session
    const session = await createSession(user.id);

    return NextResponse.json({
      success: true,
      token: session.token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      );
    }
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}

