import { elevenlabs } from "@ai-sdk/elevenlabs";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Check for API key
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is not set");
      return NextResponse.json(
        {
          error:
            "ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your .env.local file.",
        },
        { status: 500 }
      );
    }

    const { text } = (await req.json()) as { text: string };

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    console.log("[TTS] Generating speech for:", text);

    // Use ElevenLabs flash model for low latency
    const result = await generateSpeech({
      model: elevenlabs.speech("eleven_flash_v2_5"),
      text,
      voice: "JBFqnCBsd6RMkjVDRZzb", // George - natural, friendly voice
    });

    // Convert audio to base64 for easy transport
    const audioBuffer = Buffer.from(result.audio.uint8Array);
    const audioBase64 = audioBuffer.toString("base64");

    console.log("[TTS] Speech generated successfully, size:", audioBuffer.length);
    console.log("[TTS] First bytes:", audioBuffer.slice(0, 10).toString("hex"));

    return NextResponse.json({
      audio: audioBase64,
      mimeType: "audio/mp3", // ElevenLabs default format
    });
  } catch (error) {
    console.error("TTS error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to generate speech",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
