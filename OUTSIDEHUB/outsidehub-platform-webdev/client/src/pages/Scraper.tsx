import React from 'react';
import { Zap } from 'lucide-react';

export default function Scraper() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Scraper</h1>
        <p className="text-white/60">Coleta automática de dados</p>
      </div>

      <div className="glass-dark p-12 rounded-xl text-center border border-white/10">
        <div className="mb-6">
          <Zap size={64} className="mx-auto text-yellow-400 opacity-50" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Estamos trabalhando nisso</h2>
        <p className="text-white/60 max-w-md mx-auto">
          Em breve você poderá coletar dados de forma automática e segura através do nosso sistema de scraping avançado.
        </p>
      </div>
    </div>
  );
}
