import React, { useState } from 'react';
import { Download, Trash2, FileText, File } from 'lucide-react';

interface DownloadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  downloadedAt: string;
}

export default function Downloads() {
  const [files, setFiles] = useState<DownloadFile[]>([
    {
      id: '1',
      name: 'leads_export_2024.csv',
      size: 2048576,
      type: 'csv',
      downloadedAt: '2 horas atrás',
    },
    {
      id: '2',
      name: 'relatorio_emails.pdf',
      size: 1024000,
      type: 'pdf',
      downloadedAt: '1 dia atrás',
    },
    {
      id: '3',
      name: 'dados_scraper.json',
      size: 5242880,
      type: 'json',
      downloadedAt: '3 dias atrás',
    },
  ]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type === 'pdf') return <FileText size={20} className="text-red-400" />;
    return <File size={20} className="text-cyan-400" />;
  };

  const deleteFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Downloads</h1>
        <p className="text-white/60">Gerencie seus arquivos baixados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-dark p-4 rounded-lg">
          <div className="text-3xl font-bold text-cyan-400">{files.length}</div>
          <div className="text-sm text-white/60 mt-1">Arquivos</div>
        </div>
        <div className="glass-dark p-4 rounded-lg">
          <div className="text-3xl font-bold text-purple-400">{formatFileSize(totalSize)}</div>
          <div className="text-sm text-white/60 mt-1">Espaço Total</div>
        </div>
        <div className="glass-dark p-4 rounded-lg">
          <div className="text-3xl font-bold text-green-400">{files.length}</div>
          <div className="text-sm text-white/60 mt-1">Disponíveis</div>
        </div>
      </div>

      <div className="glass-dark rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Nome do Arquivo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Tamanho</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Baixado em</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-white/80">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <span className="text-white font-medium">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/80">{formatFileSize(file.size)}</td>
                  <td className="px-6 py-4 text-sm text-white/80">{file.type.toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm text-white/60">{file.downloadedAt}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors text-cyan-400">
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => deleteFile(file.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {files.length === 0 && (
        <div className="glass-dark rounded-lg p-12 text-center">
          <Download size={48} className="mx-auto mb-4 text-white/20" />
          <p className="text-white/60">Nenhum arquivo baixado ainda</p>
        </div>
      )}
    </div>
  );
}
