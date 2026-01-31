"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface Settings {
  ttsEnabled: boolean;
  dictionaryEnabled: boolean;
  dictionary: string[]; // Custom words/terms for STT correction
  showFlow: boolean; // Show animated flow dots on edges
}

const DEFAULT_SETTINGS: Settings = {
  ttsEnabled: true,
  dictionaryEnabled: true,
  dictionary: [],
  showFlow: false,
};

const STORAGE_KEY = "voice-diagram-settings";

interface SettingsContextValue extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): Settings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error("[Settings] Failed to load settings:", error);
  }
  
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("[Settings] Failed to save settings:", error);
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
    setIsHydrated(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isHydrated) {
      saveSettings(settings);
    }
  }, [settings, isHydrated]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider value={{ ...settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
