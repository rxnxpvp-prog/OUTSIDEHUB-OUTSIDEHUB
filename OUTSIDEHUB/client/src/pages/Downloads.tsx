import React, { useState, useEffect } from "react";
import { Download, Trash2, FileText, File } from "lucide-react";

interface DownloadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  date: string;
}

const STORAGE_KEY = "outsidehub_downloads";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getIcon = (type: string) =>
  type === "pdf" ? (
    <FileText size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
  ) : (
    <File size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
  );

const getTagColor = (type: string) => {
  if (type === "pdf") return "#d97706";
  if (type === "json") return "#22c55e";
  return "#38bdf8";
};

const defaultFiles: DownloadFile[] = [
  { id: "1", name: "leads_export.csv", size: 2097152, type: "csv", date: new Date().toISOString() },
  { id: "2", name: "relatorio.pdf", size: 1048576, type: "pdf", date: new Date().toISOString() },
  { id: "3", name: "dados.json", size: 5242880, type: "json", date: new Date().toISOString() },
];

export default function Downloads() {
  const [files, setFiles] = useState<DownloadFile[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: DownloadFile[] = JSON.parse(stored);
        setFiles(parsed);
        return;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setFiles(defaultFiles);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }, [files]);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const removeFile = (id: string) => setFiles((current) => current.filter((file) => file.id !== id));
  const clearFiles = () => setFiles([]);

  const downloadFile = (file: DownloadFile) => {
    const content = `Arquivo: ${file.name}\nTamanho: ${formatBytes(file.size)}\nTipo: ${file.type}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 className="page-title">Downloads</h1>
          <p className="page-sub">Gerencie seus arquivos de forma simples e limpa.</p>
        </div>

        {files.length > 0 && (
          <button className="action action-outline" type="button" onClick={clearFiles}>
            Limpar todos
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Arquivos", value: files.length },
          { label: "Total", value: formatBytes(totalSize) },
          { label: "Disponíveis", value: files.length },
        ].map((item) => (
          <div key={item.label} className="surface" style={{ padding: "16px 18px" }}>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>{item.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: "var(--foreground)" }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="surface" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Arquivo
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Tamanho
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Tipo
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Data
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px 14px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                  Nenhum arquivo disponível no momento.
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id} style={{ transition: "background 150ms" }}>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {getIcon(file.type)}
                      <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{file.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                    {formatBytes(file.size)}
                  </td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "4px 8px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,.05)",
                        color: getTagColor(file.type),
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {file.type}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: 13 }}>
                    {formatDate(file.date)}
                  </td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button
                        type="button"
                        className="action action-ghost"
                        style={{ padding: 8 }}
                        onClick={() => downloadFile(file)}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        className="action action-ghost"
                        style={{ padding: 8, color: "var(--destructive)" }}
                        onClick={() => removeFile(file.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
