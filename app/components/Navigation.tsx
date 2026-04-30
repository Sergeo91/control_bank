'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Menu, X } from 'lucide-react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section className="fixed top-0 left-0 w-full z-50 bg-stone-950 shadow-md px-4 py-2">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <Link
            href="/"
            className="flex items-center font-bold text-xl md:text-3xl"
            onClick={() => setIsOpen(false)}
          >
            <Building2 className="mr-2 text-accent" />
            Contrôle<span className="text-accent">BanqueDGSF</span>
          </Link>

          <ul className="hidden md:flex items-center space-x-6 md:pb-3">
            <li>
              <Link
                href="/"
                className="relative inline-block mx-2 py-1 text-white md:text-2xl hover:text-accent transition duration-300
                          before:content-[''] before:absolute before:left-0 before:bottom-0 before:h-[2px] before:w-0 
                          before:bg-accent before:transition-all before:duration-300 hover:before:w-full"
              >
                Évaluation
              </Link>
            </li>
          </ul>

          <button
            className="md:hidden text-accent"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </section>

      {isOpen && (
        <div className="md:hidden fixed top-16 left-0 w-full bg-stone-950 z-40 shadow-md px-4 py-2">
          <ul className="flex flex-col space-y-4 items-start">
            <li>
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="relative inline-block py-1 text-white text-xl hover:text-accent transition duration-300
                          before:content-[''] before:absolute before:left-0 before:bottom-0 before:h-[2px] before:w-0 
                          before:bg-accent before:transition-all before:duration-300 hover:before:w-full"
              >
                Évaluation
              </Link>
            </li>
          </ul>
        </div>
      )}
    </>
  );
}

