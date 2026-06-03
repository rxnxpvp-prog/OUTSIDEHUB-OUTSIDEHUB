import axios from "axios";

// Resolves the correct API base URL depending on the environment:
// - Real domain with reverse proxy (outsidenetworking.com, etc.) → "/api" (relative)
// - Raw IP address without reverse proxy (e.g. 3.138.184.70:80) → "http://ip:3333/api"
// - Port 3333 already explicit → "/api" (relative)
function resolveBaseUrl(): string {
  if (typeof window === "undefined") return "/api";
  const { protocol, hostname, port } = window.location;

  // Already on the backend port — use relative
  if (port === "3333") return "/api";

  // If hostname is a raw IPv4 address and not already on :3333,
  // the app is likely behind no reverse proxy → target :3333 explicitly
  const isRawIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  if (isRawIP) {
    return `${protocol}//${hostname}:3333/api`;
  }

  // Real domain (with or without reverse proxy) — always use relative path
  return "/api";
}

const BASE_URL = resolveBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("outsidehub_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && err.config?.url !== "/auth/login") {
      localStorage.removeItem("outsidehub_token");
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default api;
