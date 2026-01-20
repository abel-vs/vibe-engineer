"use client";

import { type ReactNode } from "react";
import { SettingsProvider } from "@/contexts/settings-context";
import { CommandMenu } from "@/components/command-menu";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      {children}
      <CommandMenu />
    </SettingsProvider>
  );
}
