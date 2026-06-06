/// <reference types="vite/client" />

type OutsideHubDesktopUpdateInfo = {
  version: string;
  currentVersion: string;
  notes?: string;
  downloadUrl?: string;
};

type OutsideHubDesktopUpdateResult = {
  ok?: boolean;
  error?: string;
  path?: string;
  action?: string;
};

interface Window {
  outsidehubDesktop?: {
    isDesktop: boolean;
    notify?: (payload: { title: string; body: string }) => void;
    updates?: {
      onAvailable: (callback: (update: OutsideHubDesktopUpdateInfo) => void) => () => void;
      check: () => Promise<OutsideHubDesktopUpdateInfo | null>;
      download: () => Promise<OutsideHubDesktopUpdateResult>;
    };
  };
}
