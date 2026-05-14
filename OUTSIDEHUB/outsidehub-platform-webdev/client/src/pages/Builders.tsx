import React from 'react';
import { Zap } from 'lucide-react';

export default function Builders() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-dark p-12 rounded-xl text-center">
        <Zap size={48} className="mx-auto mb-4 text-yellow-400" />
        <h2 className="text-2xl font-bold text-white mb-2">Builders</h2>
        <p className="text-white/60 mb-4">Estamos trabalhando nisso 🚀</p>
        <p className="text-white/40 text-sm">Esta seção em breve permitirá criar e gerenciar seus projetos</p>
      </div>
    </div>
  );
}
