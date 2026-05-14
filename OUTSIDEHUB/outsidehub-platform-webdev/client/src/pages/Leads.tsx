import React, { useState } from 'react';
import { Plus, Trash2, Download, Search, Upload, FileUp } from 'lucide-react';

interface Lead {
  id: string;
  email: string;
  name: string;
  niche: string;
  status: 'novo' | 'contatado' | 'convertido';
  addedAt: string;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1',
      email: 'joao@example.com',
      name: 'João Silva',
      niche: 'Marketing Digital',
      status: 'novo',
      addedAt: '2 horas atrás',
    },
    {
      id: '2',
      email: 'maria@example.com',
      name: 'Maria Santos',
      niche: 'E-commerce',
      status: 'contatado',
      addedAt: '1 dia atrás',
    },
    {
      id: '3',
      email: 'pedro@example.com',
      name: 'Pedro Costa',
      niche: 'SaaS',
      status: 'convertido',
      addedAt: '3 dias atrás',
    },
  ]);

  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const niches = Array.from(new Set(leads.map(l => l.niche)));

  const filteredLeads = leads.filter(lead => {
    const matchNiche = !selectedNiche || lead.niche === selectedNiche;
    const matchSearch = !searchTerm || 
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchNiche && matchSearch;
  });

  const deleteLead = (id: string) => {
    setLeads(leads.filter(l => l.id !== id));
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        const newLeads = lines.map((line, idx) => {
          const parts = line.split(',').map(p => p.trim());
          return {
            id: Date.now().toString() + idx,
            email: parts[0] || '',
            name: parts[1] || 'Sem nome',
            niche: parts[2] || 'Geral',
            status: 'novo' as const,
            addedAt: 'Agora',
          };
        }).filter(lead => lead.email);

        setLeads([...leads, ...newLeads]);
        setBulkFile(null);
        setShowBulkUpload(false);
      };
      reader.readAsText(file);
    }
  };

  const exportLeads = () => {
    const csv = filteredLeads.map(l => `${l.email},${l.name},${l.niche}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().getTime()}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'contatado':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'convertido':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const updateLeadStatus = (id: string, status: Lead['status']) => {
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Painel de Leads</h1>
        <p className="text-white/60">Gerencie seus leads de forma centralizada</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-dark p-4 rounded-lg">
          <div className="text-3xl font-bold text-cyan-400">{leads.length}</div>
          <div className="text-sm text-white/60 mt-1">Total de Leads</div>
        </div>
        <div className="glass-dark p-4 rounded-lg">
          <div className="text-3xl font-bold text-blue-400">{leads.filter(l => l.status === 'novo').length}</div>
          <div className="text-sm text-white/60 mt-1">Novos</div>
        </div>
        <div className="glass-dark p-4 rounded-lg">
          <div className="text-3xl font-bold text-yellow-400">{leads.filter(l => l.status === 'contatado').length}</div>
          <div className="text-sm text-white/60 mt-1">Contatados</div>
        </div>
        <div className="glass-dark p-4 rounded-lg">
          <div className="text-3xl font-bold text-green-400">{leads.filter(l => l.status === 'convertido').length}</div>
          <div className="text-sm text-white/60 mt-1">Convertidos</div>
        </div>
      </div>

      {/* Bulk Upload Section */}
      {showBulkUpload && (
        <div className="glass-dark p-6 rounded-xl mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileUp size={20} />
            Importar Leads em Massa
          </h2>
          <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleBulkUpload}
              className="hidden"
              id="bulk-upload"
            />
            <label htmlFor="bulk-upload" className="cursor-pointer block">
              <Upload size={40} className="mx-auto mb-3 text-white/40" />
              <div className="text-sm text-white/60">Clique para selecionar arquivo CSV ou TXT</div>
              <div className="text-xs text-white/40 mt-2">Formato: email,nome,nicho (um por linha)</div>
            </label>
          </div>
          {bulkFile && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm">
              ✓ Arquivo carregado: {bulkFile.name}
            </div>
          )}
          <button
            onClick={() => setShowBulkUpload(false)}
            className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="glass-dark p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <select
            value={selectedNiche}
            onChange={(e) => setSelectedNiche(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="">Todos os Nichos</option>
            {niches.map(niche => (
              <option key={niche} value={niche}>{niche}</option>
            ))}
          </select>
          <button
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2"
          >
            <FileUp size={18} />
            Importar
          </button>
          <button
            onClick={exportLeads}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="glass-dark rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Nicho</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Adicionado</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-white/80">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-mono">{lead.email}</td>
                  <td className="px-6 py-4 text-sm text-white">{lead.name}</td>
                  <td className="px-6 py-4 text-sm text-white/80">{lead.niche}</td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                      className={`px-3 py-1 rounded-full text-xs font-medium border-0 focus:outline-none cursor-pointer ${getStatusColor(lead.status)}`}
                    >
                      <option value="novo">Novo</option>
                      <option value="contatado">Contatado</option>
                      <option value="convertido">Convertido</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/60">{lead.addedAt}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 inline-flex"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLeads.length === 0 && (
        <div className="glass-dark rounded-lg p-12 text-center">
          <p className="text-white/60">Nenhum lead encontrado</p>
        </div>
      )}
    </div>
  );
}
