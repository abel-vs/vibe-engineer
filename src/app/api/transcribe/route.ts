import { experimental_transcribe as transcribe } from "ai";
import { elevenlabs } from "@ai-sdk/elevenlabs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Check for API key
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is not set");
      return NextResponse.json(
        { error: "ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log("[STT Debug] Received audio file:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });

    // Convert File to Uint8Array
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);

    console.log("[STT Debug] Audio data size:", audioData.length, "bytes");

    const { text } = await transcribe({
      model: elevenlabs.transcription("scribe_v1"),
      audio: audioData,
      providerOptions: {
        elevenlabs: {
          languageCode: "en",
          tagAudioEvents: false,
        },
      },
    });

    console.log("[STT Debug] Transcription result:", text);

    return NextResponse.json({ transcript: text });
  } catch (error) {
    console.error("[STT Debug] Transcription error:", error);

    // Return more detailed error info
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error ? error.stack : String(error);

    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}
