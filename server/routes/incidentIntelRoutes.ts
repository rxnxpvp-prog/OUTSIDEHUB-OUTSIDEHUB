import { Router } from "express";
import fs from "fs";
import path from "path";
import { requireAdmin } from "../auth.js";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data", "incident-intel");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collectRows() {
  const manifest = readJson<any>("manifest.json", { generatedAt: "", sources: [] });
  const cisa = readJson<any>("cisa-kev.json", { vulnerabilities: [] });
  const advisories = readJson<any[]>("github-advisories.json", []);

  const cisaRows = (cisa.vulnerabilities || []).slice(0, 250).map((item: any) => ({
    source: "CISA KEV",
    id: item.cveID,
    title: item.vulnerabilityName,
    vendor: item.vendorProject,
    product: item.product,
    severity: item.knownRansomwareCampaignUse === "Known" ? "high" : "known exploited",
    date: item.dateAdded,
    action: item.requiredAction,
  }));

  const advisoryRows = advisories.slice(0, 250).map((item: any) => ({
    source: "GitHub Advisory",
    id: item.ghsa_id || item.cve_id,
    title: item.summary,
    vendor: item.ecosystem || "",
    product: item.vulnerabilities?.[0]?.package?.name || "",
    severity: item.severity || "",
    date: item.published_at || item.updated_at,
    action: item.html_url || "",
  }));

  return { manifest, rows: [...cisaRows, ...advisoryRows] };
}

router.get("/", requireAdmin, (_req, res) => {
  const { manifest, rows } = collectRows();
  res.json({ generatedAt: manifest.generatedAt, sources: manifest.sources, count: rows.length, rows });
});

router.get("/table", requireAdmin, (_req, res) => {
  const { manifest, rows } = collectRows();
  const body = rows.map((row: any) => `
    <tr>
      <td>${escapeHtml(row.source)}</td>
      <td>${escapeHtml(row.id)}</td>
      <td>${escapeHtml(row.title)}</td>
      <td>${escapeHtml(row.vendor)}</td>
      <td>${escapeHtml(row.product)}</td>
      <td>${escapeHtml(row.severity)}</td>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.action)}</td>
    </tr>
  `).join("");

  res.type("html").send(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>OutsideHub Incident Intel</title>
        <style>
          body { background:#08090c; color:#e5e7eb; font-family: Inter, system-ui, sans-serif; margin:24px; }
          h1 { font-size:20px; margin:0 0 4px; }
          p { color:#8b8fa3; margin:0 0 18px; }
          table { width:100%; border-collapse:collapse; font-size:12px; }
          th, td { border:1px solid #252832; padding:8px 10px; text-align:left; vertical-align:top; }
          th { background:#11131a; color:#a4a8bb; text-transform:uppercase; font-size:11px; letter-spacing:.04em; }
          tr:nth-child(even) { background:#0d0f15; }
          td:nth-child(3), td:nth-child(8) { max-width:420px; word-break:break-word; }
        </style>
      </head>
      <body>
        <h1>Incident Intelligence</h1>
        <p>Generated at ${escapeHtml(manifest.generatedAt)}. Public defensive sources only.</p>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>ID</th>
              <th>Title</th>
              <th>Vendor</th>
              <th>Product</th>
              <th>Severity</th>
              <th>Date</th>
              <th>Action / Reference</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>`);
});

export default router;
