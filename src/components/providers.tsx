"use client";

import { CommandMenu } from "@/components/command-menu";
import { SettingsProvider } from "@/contexts/settings-context";
import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      {children}
      <CommandMenu />
    </SettingsProvider>
  );
}
