"use client";

import { CommandMenu } from "@/components/command-menu";
import { Toaster } from "@/components/ui/sonner";
import { CodeViewProvider } from "@/contexts/code-view-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <CodeViewProvider>
        {children}
        <CommandMenu />
        <Toaster />
      </CodeViewProvider>
    </SettingsProvider>
  );
}
