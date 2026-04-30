'use client';

import { Building2, Wrench, Clock } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200 px-4">
      <div className="card bg-base-100 shadow-xl max-w-lg w-full">
        <div className="card-body text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Building2 className="text-warning mx-auto" size={80} />
              <Wrench className="text-error absolute -bottom-2 -right-2" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-error">Maintenance en cours</h1>
          <div className="divider"></div>
          <p className="text-lg text-gray-600 mb-4">
            La plateforme est actuellement en maintenance pour améliorer nos services.
          </p>
          <div className="alert alert-info">
            <Clock size={20} />
            <span>Veuillez réessayer dans quelques instants.</span>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Nous nous excusons pour la gêne occasionnée.</p>
            <p className="mt-2">Merci de votre compréhension.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

