"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Loader2, Mic, MicOff, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceControllerProps {
  onTranscript: (transcript: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  disabled?: boolean;
  dictionary?: string[];
}

export function VoiceController({
  onTranscript,
  onRecordingChange,
  disabled = false,
  dictionary = [],
}: VoiceControllerProps) {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTextSubmit = useCallback(() => {
    const trimmed = textInput.trim();
    if (trimmed && !disabled) {
      onTranscript(trimmed);
      setTextInput("");
    }
  }, [textInput, disabled, onTranscript]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleTextSubmit();
      }
    },
    [handleTextSubmit]
  );

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size > 0) {
          await processAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      onRecordingChange?.(true);
    } catch (err) {
      setError("Could not access microphone. Please check permissions.");
      console.error("Error starting recording:", err);
    }
  }, [onRecordingChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingChange?.(false);
    }
  }, [isRecording, onRecordingChange]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      audioChunksRef.current = [];
      setIsRecording(false);
      onRecordingChange?.(false);
      setError(null);
    }
  }, [isRecording, onRecordingChange]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    console.log("[VoiceController] Processing audio blob:", {
      type: audioBlob.type,
      size: audioBlob.size,
    });

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      if (dictionary.length > 0) {
        formData.append("dictionary", JSON.stringify(dictionary));
      }

      console.log("[VoiceController] Sending to /api/transcribe...");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("[VoiceController] Transcribe response:", data);

      if (!response.ok) {
        const errorMsg = data.details || data.error || "Transcription failed";
        throw new Error(errorMsg);
      }

      const { transcript } = data;
      if (transcript) {
        console.log("[VoiceController] Transcript received:", transcript);
        onTranscript(transcript);
      } else {
        console.warn("[VoiceController] Empty transcript received");
        setError("No speech detected. Please try again.");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to process audio: ${errorMsg}`);
      console.error("[VoiceController] Error processing audio:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard shortcut - hold space to record (only in voice mode), Escape to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !e.repeat &&
        !disabled &&
        !isRecording &&
        !isProcessing &&
        isVoiceMode
      ) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          startRecording();
        }
      }

      if (e.key === "Escape" && isRecording) {
        e.preventDefault();
        cancelRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isRecording && isVoiceMode) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          return;
        }
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [disabled, isRecording, isProcessing, isVoiceMode, startRecording, stopRecording, cancelRecording]);

  // Focus input when switching to text mode
  useEffect(() => {
    if (!isVoiceMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVoiceMode]);

  return (
    <div className="flex flex-col gap-3">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {isVoiceMode ? "Voice mode" : "Text mode"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Text</span>
          <Switch
            checked={isVoiceMode}
            onCheckedChange={setIsVoiceMode}
            disabled={disabled || isProcessing || isRecording}
          />
          <span className="text-xs text-gray-400">Voice</span>
        </div>
      </div>

      {/* Input Area */}
      {isVoiceMode ? (
        // Voice Mode UI
        <div className="flex flex-col items-center gap-2">
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className={cn(
              "w-16 h-16 rounded-full transition-all duration-200",
              isRecording && "animate-pulse scale-110",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled || isProcessing}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={isRecording ? stopRecording : undefined}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {isProcessing
                ? "Processing..."
                : isRecording
                ? "Recording... Release to stop"
                : "Hold to speak"}
            </p>
            {isRecording ? (
              <Button
                variant="outline"
                size="sm"
                onClick={cancelRecording}
                className="mt-2 h-8 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                or hold <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Space</kbd>
              </p>
            )}
          </div>
        </div>
      ) : (
        // Text Mode UI
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            disabled={disabled}
            className="flex-1"
          />
          <Button
            onClick={handleTextSubmit}
            disabled={disabled || !textInput.trim()}
            size="icon"
            className="shrink-0"
          >
            {disabled ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
