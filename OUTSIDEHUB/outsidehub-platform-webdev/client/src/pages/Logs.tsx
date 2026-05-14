import React from 'react';
import { FileText } from 'lucide-react';

export default function Logs() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-dark p-12 rounded-xl text-center">
        <FileText size={48} className="mx-auto mb-4 text-blue-400" />
        <h2 className="text-2xl font-bold text-white mb-2">Logs</h2>
        <p className="text-white/60 mb-4">Estamos trabalhando nisso 🚀</p>
        <p className="text-white/40 text-sm">Em breve você poderá visualizar todos os logs do sistema</p>
      </div>
    </div>
  );
}
