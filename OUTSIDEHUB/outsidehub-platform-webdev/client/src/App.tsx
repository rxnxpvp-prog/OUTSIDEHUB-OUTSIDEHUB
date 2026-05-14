import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import BottomNav from "./components/BottomNav";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import TempMail from "./pages/TempMail";
import Leads from "./pages/Leads";
import EmailDispatch from "./pages/EmailDispatch";
import Scraper from "./pages/Scraper";
import Search from "./pages/Search";
import Downloads from "./pages/Downloads";
import Profile from "./pages/Profile";
import GlobalChat from "./components/GlobalChat";
import AdminPanel from "./pages/AdminPanel";
import Builders from "./pages/Builders";
import Logs from "./pages/Logs";

function AppContent() {
  const [currentPage, setCurrentPage] = useState("feed");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentPage("login");
    }
  }, [isAuthenticated]);

  const renderPage = () => {
    if (!isAuthenticated) {
      return <Login onLoginSuccess={() => setCurrentPage("feed")} />;
    }

    switch (currentPage) {
      case "feed":
        return <Feed />;
      case "tempmail":
        return <TempMail />;
      case "leads":
        return <Leads />;
      case "email":
        return <EmailDispatch />;
      case "scraper":
        return <Scraper />;
      case "search":
        return <Search />;
      case "downloads":
        return <Downloads />;
      case "profile":
        return <Profile />;
      case "chat":
        return <GlobalChat />;
      case "admin":
        return <AdminPanel />;
      case "builders":
        return <Builders />;
      case "logs":
        return <Logs />;
      case "privacy":
        return <Profile />;
      default:
        return <Feed />;
    }
  };

  const handleProfileClick = () => setCurrentPage('profile');
  const handlePrivacyClick = () => setCurrentPage('privacy');

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setCurrentPage("feed")} />;
  }

  return (
    <>
      <Layout
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onProfileClick={handleProfileClick}
        onPrivacyClick={handlePrivacyClick}
      >
        {renderPage()}
      </Layout>
      <BottomNav
        onProfileClick={handleProfileClick}
        onPrivacyClick={handlePrivacyClick}
      />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <ChatProvider>
            <TooltipProvider>
              <Toaster />
              <AppContent />
            </TooltipProvider>
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
