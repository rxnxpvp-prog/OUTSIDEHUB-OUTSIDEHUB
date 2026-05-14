import React, { useState } from 'react';
import { Search as SearchIcon, Clock, Trash2 } from 'lucide-react';

interface SearchResult {
  id: string;
  query: string;
  timestamp: string;
  results: number;
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([
    {
      id: '1',
      query: 'leads marketing digital',
      timestamp: '2 horas atrás',
      results: 1240,
    },
    {
      id: '2',
      query: 'e-commerce brasil',
      timestamp: '1 dia atrás',
      results: 3450,
    },
    {
      id: '3',
      query: 'agências de publicidade',
      timestamp: '3 dias atrás',
      results: 892,
    },
  ]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      const newSearch: SearchResult = {
        id: Date.now().toString(),
        query: query,
        timestamp: 'Agora',
        results: Math.floor(Math.random() * 5000),
      };
      setRecentSearches([newSearch, ...recentSearches]);
      setSearchQuery('');
    }
  };

  const deleteSearch = (id: string) => {
    setRecentSearches(recentSearches.filter(s => s.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pesquisa Avançada</h1>
        <p className="text-white/60">Busque e filtre informações</p>
      </div>

      <div className="glass-dark p-8 rounded-xl mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-4 text-white/40" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              placeholder="Digite sua pesquisa..."
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors text-lg"
            />
          </div>
          <button
            onClick={() => handleSearch(searchQuery)}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Pesquisar
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Pesquisas Recentes</h2>
        {recentSearches.map((search) => (
          <div key={search.id} className="glass-dark p-4 rounded-lg flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4 flex-1">
              <Clock size={18} className="text-white/40 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white">{search.query}</div>
                <div className="text-xs text-white/50">{search.timestamp} • {search.results} resultados</div>
              </div>
            </div>
            <button
              onClick={() => deleteSearch(search.id)}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 flex-shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 glass-dark p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4\">Dica: API de Pesquisa</h3>
        <p className="text-white/60 text-sm">
          Em breve, você poderá integrar pesquisas avançadas via API. 
          Isso permitirá automação completa de buscas e filtros personalizados.
        </p>
      </div>
    </div>
  );
}
