'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Building2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Vérifier si déjà connecté
    const token = localStorage.getItem('session_token');
    if (token) {
      fetch('/api/auth/me?token=' + token)
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            router.push('/');
          }
        });
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('session_token', data.token);
        toast.success('Connexion réussie!');
        
        // Rediriger vers /admin si l'utilisateur est admin, sinon vers la page d'origine ou /
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
        if (data.user?.role === 'admin') {
          router.push(redirectUrl || '/admin');
        } else {
          router.push(redirectUrl || '/');
        }
      } else {
        toast.error(data.error || 'Erreur lors de la connexion');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-6">
          <div className="flex items-center justify-center mb-6">
            <Building2 className="text-accent" size={48} />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">Connexion</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Mot de passe</span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

