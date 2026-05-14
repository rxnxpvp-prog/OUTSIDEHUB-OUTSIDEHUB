import React, { useState } from 'react';
import { Copy, Trash2, Plus, RefreshCw, Clock, Mail } from 'lucide-react';

interface Email {
  id: string;
  address: string;
  received: number;
  createdAt: string;
}

export default function TempMail() {
  const [emails, setEmails] = useState<Email[]>([
    {
      id: '1',
      address: 'user123@tempmail.com',
      received: 3,
      createdAt: '2 horas atrás',
    },
    {
      id: '2',
      address: 'test456@tempmail.com',
      received: 0,
      createdAt: '5 horas atrás',
    },
  ]);

  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const generateNewEmail = () => {
    const newEmail: Email = {
      id: Date.now().toString(),
      address: `user${Math.random().toString(36).substr(2, 9)}@tempmail.com`,
      received: 0,
      createdAt: 'Agora',
    };
    setEmails([newEmail, ...emails]);
  };

  const deleteEmail = (id: string) => {
    setEmails(emails.filter(e => e.id !== id));
    if (selectedEmail === id) setSelectedEmail(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">TempMail</h1>
        <p className="text-white/60">Gerenciar emails temporários</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email List */}
        <div className="lg:col-span-1">
          <div className="glass-dark rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-semibold text-white">Meus Emails</h2>
              <button
                onClick={generateNewEmail}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-cyan-400"
                title="Gerar novo email"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
              {emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    selectedEmail === email.id
                      ? 'bg-purple-500/20 border-l-2 border-purple-500'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="text-sm font-medium text-white truncate">{email.address}</div>
                  <div className="text-xs text-white/50 mt-1">{email.received} emails</div>
                  <div className="text-xs text-white/40 mt-1">{email.createdAt}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Email Details */}
        <div className="lg:col-span-2">
          {selectedEmail ? (
            <div className="glass-dark rounded-xl p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Detalhes do Email</h3>
                  <button
                    onClick={() => deleteEmail(selectedEmail)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm text-white break-all">
                      {emails.find(e => e.id === selectedEmail)?.address}
                    </div>
                    <button
                      onClick={() => copyToClipboard(emails.find(e => e.id === selectedEmail)?.address || '')}
                      className="ml-2 p-2 hover:bg-white/10 rounded-lg transition-colors text-cyan-400 flex-shrink-0"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/60">
                  <Clock size={16} />
                  <span className="text-sm">Expira em 24 horas</span>
                </div>
                <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2">
                  <RefreshCw size={18} />
                  Atualizar Emails
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="font-semibold text-white mb-4">Emails Recebidos</h4>
                <div className="space-y-2 text-center text-white/60 py-8">
                  <p>Nenhum email recebido ainda</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-dark rounded-xl p-12 flex flex-col items-center justify-center text-center h-96">
              <Mail size={48} className="text-white/20 mb-4" />
              <p className="text-white/60">Selecione um email para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
