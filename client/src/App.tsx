import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { MaintenanceProvider } from "./contexts/MaintenanceContext";
import MaintenanceGate from "./components/MaintenanceGate";
import DiscordPresence from "./components/DiscordPresence";
import AppNotifications from "./components/AppNotifications";
import DesktopUpdateBanner from "./components/DesktopUpdateBanner";

// Pages
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Sms from "./pages/Sms";
import LeadOps from "./pages/LeadOps";
import EmailDispatch from "./pages/EmailDispatch";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import GlobalChat from "./components/GlobalChat";
import AdminPanel from "./pages/AdminPanel";
import Builders from "./pages/Builders";
import Logs from "./pages/Logs";
import Discord from "./pages/Discord";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

function Spinner() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
      <span className="spin" style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--foreground)", display: "inline-block" }} />
    </div>
  );
}

function Denied() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>Acesso negado</p>
        <p style={{ fontSize: 13, marginTop: 4, color: "var(--muted-foreground)" }}>Você não tem permissão para acessar esta área.</p>
      </div>
    </div>
  );
}

function AuthRoute({ children, feature }: { children: React.ReactNode, feature?: string }) {
  const { isAuthenticated, user, isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (feature && !isAdmin && user?.permissions) {
    if (user.permissions[feature] === false) return <Denied />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!isAdmin) return <Denied />;
  return <>{children}</>;
}

function AppShell() {
  const { isAuthenticated, loading } = useAuth();
  
  // Check if subdomain exists
  const hostname = window.location.hostname;
  const hostParts = hostname.split('.');
  const rootDomains = [
    "outsidenetworking.com",
    "www.outsidenetworking.com",
    "outsidehub.com.br",
    "www.outsidehub.com.br",
  ];
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname);
  // Raw IPv4 addresses (e.g. 3.138.184.70) must never be treated as subdomains
  const isIPAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  const tunnelHostSuffixes = [
    "trycloudflare.com",
    "loca.lt",
    "ngrok-free.app",
    "ngrok.app",
  ];
  const isTunnelHost = tunnelHostSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
  const ignoredSubdomains = ["www"];
  const knownRoot = rootDomains.includes(hostname.toLowerCase());
  const isSubdomain =
    !knownRoot &&
    !isLocalHost &&
    !isIPAddress &&
    !isTunnelHost &&
    (
      (hostname.endsWith(".outsidenetworking.com") && hostParts.length > 3) ||
      (hostname.endsWith(".outsidehub.com.br") && hostParts.length > 3) ||
      (!hostname.endsWith(".outsidenetworking.com") && !hostname.endsWith(".outsidehub.com.br") && hostParts.length > 2)
    ) &&
    !ignoredSubdomains.includes(hostParts[0].toLowerCase());
  
  const subdomain = isSubdomain ? hostParts[0] : null;

  if (loading) return <Spinner />;

  if (subdomain) {
    return (
      <Switch>
        <Route path="*">
          <PublicProfile identifierParam={subdomain} />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      {/* Public */}
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <Login />}
      </Route>

      <Route path="/u/:identifier">
        <PublicProfile />
      </Route>

      {/* Protected — wrapped in Layout */}
      <Route path="/">
        <AuthRoute feature="feed">
          <MaintenanceGate feature="Feed">
            <Layout><Feed /></Layout>
          </MaintenanceGate>
        </AuthRoute>
      </Route>
      <Route path="/feed">
        <AuthRoute feature="feed">
          <MaintenanceGate feature="Feed">
            <Layout><Feed /></Layout>
          </MaintenanceGate>
        </AuthRoute>
      </Route>
      <Route path="/chat">
        <AuthRoute feature="chat">
          <MaintenanceGate feature="Chat">
            <Layout><GlobalChat /></Layout>
          </MaintenanceGate>
        </AuthRoute>
      </Route>
      <Route path="/tempmail">
        <Redirect to="/sms" />
      </Route>
      <Route path="/sms">
        <AuthRoute feature="sms"><Layout><Sms /></Layout></AuthRoute>
      </Route>
      <Route path="/leads">
        <AuthRoute feature="leads"><Layout><LeadOps /></Layout></AuthRoute>
      </Route>
      <Route path="/email">
        <AuthRoute feature="email"><Layout><EmailDispatch /></Layout></AuthRoute>
      </Route>
      <Route path="/search">
        <AuthRoute feature="search">
          <MaintenanceGate feature="Search">
            <Layout><Search /></Layout>
          </MaintenanceGate>
        </AuthRoute>
      </Route>
      <Route path="/downloads">
        <Redirect to="/feed" />
      </Route>
      <Route path="/profile">
        <AuthRoute><Layout><Profile /></Layout></AuthRoute>
      </Route>
      <Route path="/privacy">
        <AuthRoute><Layout><Privacy /></Layout></AuthRoute>
      </Route>
      <Route path="/builders">
        <AuthRoute feature="builders">
          <MaintenanceGate feature="Builders">
            <Layout><Builders /></Layout>
          </MaintenanceGate>
        </AuthRoute>
      </Route>
      <Route path="/logs">
        <AuthRoute>
          <MaintenanceGate feature="Logs">
            <Layout><Logs /></Layout>
          </MaintenanceGate>
        </AuthRoute>
      </Route>
      <Route path="/scraper">
        <Redirect to="/leads" />
      </Route>
      <Route path="/scrapper">
        <Redirect to="/leads" />
      </Route>
      <Route path="/discord">
        <AuthRoute feature="discord"><Layout><Discord /></Layout></AuthRoute>
      </Route>

      {/* Admin only */}
      <Route path="/admin">
        <AdminRoute><Layout><AdminPanel /></Layout></AdminRoute>
      </Route>

      {/* 404 */}
      <Route>
        {isAuthenticated ? <NotFound /> : <Redirect to="/login" />}
      </Route>
    </Switch>
  );
}

import Background from "./components/Background";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <ChatProvider>
            <TooltipProvider>
              <Background />
              <Router>
                <DiscordPresence />
                <AppNotifications />
                <DesktopUpdateBanner />
                <Toaster richColors position="top-right" closeButton />
                <MaintenanceProvider>
                  <AppShell />
                </MaintenanceProvider>
              </Router>
            </TooltipProvider>
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
