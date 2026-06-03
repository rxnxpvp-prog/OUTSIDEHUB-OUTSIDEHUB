import axios from "axios";

// In production/Electron, the frontend may be loaded from a URL that doesn't
// include the backend port (e.g. http://3.138.184.70 instead of :3333).
// Detect this and build the correct absolute API URL.
function resolveBaseUrl(): string {
  if (typeof window === "undefined") return "/api";
  const { protocol, hostname, port } = window.location;
  // If already on port 3333, use relative path (standard production setup)
  if (port === "3333") return "/api";
  // If on port 80/443 or no port (Electron loading remote), target :3333 explicitly
  const effectivePort = port || (protocol === "https:" ? "443" : "80");
  if (effectivePort === "80" || effectivePort === "443" || effectivePort === "") {
    return `${protocol}//${hostname}:3333/api`;
  }
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
