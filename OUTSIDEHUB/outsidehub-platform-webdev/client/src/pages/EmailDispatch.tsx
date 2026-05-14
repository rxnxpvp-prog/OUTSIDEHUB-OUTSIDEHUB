import React, { useState } from 'react';
import { Send, Paperclip, X, Clock, CheckCircle, Code, Eye, Settings, Mail } from 'lucide-react';

interface Attachment {
  id: string;
  name: string;
  size: number;
}

interface SMTPConfig {
  host: string;
  port: string;
  email: string;
  password: string;
  fromName: string;
}

export default function EmailDispatch() {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [scheduleTime, setScheduleTime] = useState('');
  const [sent, setSent] = useState(false);
  const [showHTMLEditor, setShowHTMLEditor] = useState(false);
  const [showSMTPConfig, setShowSMTPConfig] = useState(false);
  const [editorMode, setEditorMode] = useState<'text' | 'html' | 'preview'>('text');

  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig>(() => {
    const stored = localStorage.getItem('outsidehub_smtp_config');
    return stored ? JSON.parse(stored) : {
      host: '',
      port: '587',
      email: '',
      password: '',
      fromName: '',
    };
  });

  const SMTP_PRESETS = {
    hostinger: { host: 'smtp.hostinger.com', port: '587' },
    gmail: { host: 'smtp.gmail.com', port: '587' },
    outlook: { host: 'smtp-mail.outlook.com', port: '587' },
    sendgrid: { host: 'smtp.sendgrid.net', port: '587' },
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      Array.from(files).forEach(file => {
        const newAttachment: Attachment = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
        };
        setAttachments([...attachments, newAttachment]);
      });
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const saveSMTPConfig = () => {
    localStorage.setItem('outsidehub_smtp_config', JSON.stringify(smtpConfig));
    setShowSMTPConfig(false);
  };

  const handleSend = () => {
    if (recipients && subject && body) {
      setSent(true);
      setTimeout(() => {
        setRecipients('');
        setSubject('');
        setBody('');
        setHtmlBody('');
        setAttachments([]);
        setScheduleTime('');
        setSent(false);
      }, 3000);
    }
  };

  const insertHTMLTemplate = (template: string) => {
    setHtmlBody(htmlBody + template);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Disparo de Email</h1>
        <p className="text-white/60">Envie emails em massa para seus leads</p>
      </div>

      {sent && (
        <div className="glass-dark p-4 rounded-lg mb-6 border border-green-500/30 bg-green-500/10">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400" />
            <div>
              <div className="font-semibold text-green-300">Email agendado com sucesso!</div>
              <div className="text-sm text-green-300/70">Seu email será enviado em breve</div>
            </div>
          </div>
        </div>
      )}

      {/* SMTP Configuration */}
      {showSMTPConfig && (
        <div className="glass-dark p-6 rounded-xl mb-6 border border-purple-500/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings size={20} />
              Configurar SMTP
            </h2>
            <button onClick={() => setShowSMTPConfig(false)} className="text-white/60 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Provedor SMTP</label>
              <select
                onChange={(e) => {
                  const preset = SMTP_PRESETS[e.target.value as keyof typeof SMTP_PRESETS];
                  if (preset) {
                    setSMTPConfig({ ...smtpConfig, ...preset });
                  }
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Selecione um provedor</option>
                <option value="hostinger">Hostinger</option>
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="sendgrid">SendGrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Host SMTP</label>
              <input
                type="text"
                value={smtpConfig.host}
                onChange={(e) => setSMTPConfig({ ...smtpConfig, host: e.target.value })}
                placeholder="smtp.hostinger.com"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Porta</label>
              <input
                type="text"
                value={smtpConfig.port}
                onChange={(e) => setSMTPConfig({ ...smtpConfig, port: e.target.value })}
                placeholder="587"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Email</label>
              <input
                type="email"
                value={smtpConfig.email}
                onChange={(e) => setSMTPConfig({ ...smtpConfig, email: e.target.value })}
                placeholder="seu@email.com"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Senha/Token</label>
              <input
                type="password"
                value={smtpConfig.password}
                onChange={(e) => setSMTPConfig({ ...smtpConfig, password: e.target.value })}
                placeholder="Sua senha ou token"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Nome do Remetente</label>
              <input
                type="text"
                value={smtpConfig.fromName}
                onChange={(e) => setSMTPConfig({ ...smtpConfig, fromName: e.target.value })}
                placeholder="Seu Nome"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={saveSMTPConfig}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Salvar Configuração
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recipients */}
          <div className="glass-dark p-6 rounded-xl">
            <label className="block text-sm font-semibold text-white mb-3">Destinatários</label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Cole os emails separados por vírgula ou quebra de linha"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              rows={4}
            />
            <div className="text-xs text-white/50 mt-2">
              {recipients.split(/[,\n]/).filter(e => e.trim()).length} emails adicionados
            </div>
          </div>

          {/* Subject */}
          <div className="glass-dark p-6 rounded-xl">
            <label className="block text-sm font-semibold text-white mb-3">Assunto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Digite o assunto do email"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Email Body Editor */}
          <div className="glass-dark p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-white">Mensagem</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditorMode('text')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    editorMode === 'text'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  Texto
                </button>
                <button
                  onClick={() => setEditorMode('html')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                    editorMode === 'html'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Code size={14} />
                  HTML
                </button>
                <button
                  onClick={() => setEditorMode('preview')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                    editorMode === 'preview'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Eye size={14} />
                  Preview
                </button>
              </div>
            </div>

            {editorMode === 'text' && (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escreva sua mensagem aqui..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                rows={8}
              />
            )}

            {editorMode === 'html' && (
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap mb-3">
                  <button
                    onClick={() => insertHTMLTemplate('<h1>Título</h1>')}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => insertHTMLTemplate('<p>Parágrafo</p>')}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white"
                  >
                    Parágrafo
                  </button>
                  <button
                    onClick={() => insertHTMLTemplate('<strong>Negrito</strong>')}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white"
                  >
                    Negrito
                  </button>
                  <button
                    onClick={() => insertHTMLTemplate('<a href="#">Link</a>')}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white"
                  >
                    Link
                  </button>
                  <button
                    onClick={() => insertHTMLTemplate('<img src="" alt="Imagem" />')}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white"
                  >
                    Imagem
                  </button>
                  <button
                    onClick={() => insertHTMLTemplate('<button>Botão</button>')}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white"
                  >
                    Botão
                  </button>
                </div>
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="Cole seu HTML aqui..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors resize-none font-mono text-sm"
                  rows={8}
                />
              </div>
            )}

            {editorMode === 'preview' && (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white min-h-64 max-h-96 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: htmlBody || '<p>Nenhum HTML para visualizar</p>' }} />
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="glass-dark p-6 rounded-xl">
            <label className="block text-sm font-semibold text-white mb-3">Anexos</label>
            <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-purple-500/50 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Paperclip size={32} className="mx-auto mb-2 text-white/40" />
                <div className="text-sm text-white/60">Clique para adicionar arquivos ou arraste aqui</div>
                <div className="text-xs text-white/40 mt-1">Máximo 25MB por arquivo</div>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip size={16} className="text-cyan-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{file.name}</div>
                        <div className="text-xs text-white/50">{formatFileSize(file.size)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(file.id)}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-400 ml-2 flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SMTP Config Button */}
          <button
            onClick={() => setShowSMTPConfig(!showSMTPConfig)}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Mail size={18} />
            Configurar SMTP
          </button>

          {/* Schedule */}
          <div className="glass-dark p-6 rounded-xl">
            <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock size={16} />
              Agendar Envio
            </label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors text-sm"
            />
            <div className="text-xs text-white/50 mt-2">Deixe em branco para enviar agora</div>
          </div>

          {/* Summary */}
          <div className="glass-dark p-6 rounded-xl">
            <h3 className="font-semibold text-white mb-4">Resumo</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-white/60">Destinatários</div>
                <div className="text-lg font-bold text-cyan-400">{recipients.split(/[,\n]/).filter(e => e.trim()).length}</div>
              </div>
              <div>
                <div className="text-white/60">Assunto</div>
                <div className="text-white truncate">{subject || 'Não preenchido'}</div>
              </div>
              <div>
                <div className="text-white/60">Anexos</div>
                <div className="text-white">{attachments.length} arquivo(s)</div>
              </div>
              <div>
                <div className="text-white/60">Versão</div>
                <div className="text-white">{htmlBody ? 'HTML + Texto' : 'Apenas Texto'}</div>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!recipients || !subject || (!body && !htmlBody)}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send size={18} />
            Enviar Agora
          </button>
        </div>
      </div>
    </div>
  );
}
