"use client";

import { type ReactNode } from "react";
import { SettingsProvider } from "@/contexts/settings-context";
import { CommandMenu } from "@/components/command-menu";
import { Agentation } from "agentation";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      {children}
      <CommandMenu />
      {process.env.NODE_ENV === "development" && <Agentation />}
    </SettingsProvider>
  );
}
