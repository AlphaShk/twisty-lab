/// <reference types="vite/client" />

interface Window {
  desktop?: {
    platform: string;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
}
