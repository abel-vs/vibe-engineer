"use client";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/contexts/settings-context";
import { ArrowLeft, Book, BookOpen, BookX, Keyboard, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type View = "main" | "dictionary";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const { ttsEnabled, dictionaryEnabled, dictionary, updateSetting } = useSettings();
  const [dictionaryText, setDictionaryText] = useState("");

  // Sync dictionary to textarea when opening
  useEffect(() => {
    if (open && view === "dictionary") {
      setDictionaryText(dictionary.join("\n"));
    }
  }, [open, view, dictionary]);

  // Reset view when closing
  useEffect(() => {
    if (!open) {
      setView("main");
    }
  }, [open]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const toggleTTS = () => {
    updateSetting("ttsEnabled", !ttsEnabled);
  };

  const toggleDictionary = () => {
    updateSetting("dictionaryEnabled", !dictionaryEnabled);
  };

  const handleDictionaryChange = useCallback((value: string) => {
    setDictionaryText(value);
    
    // Parse lines into dictionary array, filtering empty lines
    const words = value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    
    updateSetting("dictionary", words);
  }, [updateSetting]);

  const handleBackToMain = () => {
    setView("main");
  };

  // Dictionary editing view
  if (view === "dictionary") {
    return (
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex flex-col h-[400px]">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToMain}
              className="h-8 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="text-sm font-medium">Custom Dictionary</span>
          </div>

          {/* Content */}
          <div className="flex-1 p-3 space-y-3 overflow-auto">
            <p className="text-sm text-muted-foreground">
              Add domain-specific words (one per line) to help correct speech recognition errors.
            </p>
            
            <Textarea
              placeholder={"e.g.\nCerebras\nReactFlow\nPFD\nBFD"}
              value={dictionaryText}
              onChange={(e) => handleDictionaryChange(e.target.value)}
              onKeyDown={(e) => {
                // Stop propagation to prevent cmdk and voice controller from capturing these keys
                e.stopPropagation();
              }}
              className="min-h-[220px] font-mono text-sm resize-none"
              autoFocus
            />

            <p className="text-xs text-muted-foreground">
              {dictionary.length} {dictionary.length === 1 ? "word" : "words"} in dictionary
            </p>
          </div>
        </div>
      </CommandDialog>
    );
  }

  // Main command menu view
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Settings">
          <CommandItem
            onSelect={toggleTTS}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {ttsEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span>Voice Responses (TTS)</span>
            </div>
            <Switch
              checked={ttsEnabled}
              onCheckedChange={toggleTTS}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </CommandItem>
          <CommandItem
            onSelect={toggleDictionary}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {dictionaryEnabled ? (
                <BookOpen className="h-4 w-4" />
              ) : (
                <BookX className="h-4 w-4" />
              )}
              <span>Dictionary Correction</span>
            </div>
            <Switch
              checked={dictionaryEnabled}
              onCheckedChange={toggleDictionary}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </CommandItem>
          <CommandItem onSelect={() => setView("dictionary")}>
            <Book className="h-4 w-4" />
            <span>Custom Dictionary</span>
            <CommandShortcut>{dictionary.length} words</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Help">
          <CommandItem disabled>
            <Keyboard className="h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
