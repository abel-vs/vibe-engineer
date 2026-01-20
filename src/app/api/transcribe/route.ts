import { cerebras } from "@ai-sdk/cerebras";
import { elevenlabs } from "@ai-sdk/elevenlabs";
import { generateText, experimental_transcribe as transcribe } from "ai";
import { NextRequest, NextResponse } from "next/server";

/**
 * Corrects likely transcription errors using the user's custom dictionary.
 * 
 * WARNING: This is a best-effort correction step. The LLM may:
 * - Over-correct words that were actually correct
 * - Miss some transcription errors
 * - Introduce new errors in rare cases
 * 
 * The correction is applied after STT and before returning the transcript.
 * If correction fails, the original STT output is returned.
 */
async function correctTranscription(
  rawTranscript: string,
  dictionary: string[]
): Promise<{ correctedText: string; wasModified: boolean }> {
  // If no dictionary words, skip correction
  if (dictionary.length === 0) {
    return { correctedText: rawTranscript, wasModified: false };
  }

  // Check for Cerebras API key
  if (!process.env.CEREBRAS_API_KEY) {
    console.warn("[STT Correction] CEREBRAS_API_KEY not set, skipping correction");
    return { correctedText: rawTranscript, wasModified: false };
  }

  try {
    const model = process.env.CEREBRAS_MODEL || "llama-4-scout-17b-16e-instruct";
    
    console.log("[STT Correction] Running correction with dictionary:", dictionary);

    const { text: correctedText } = await generateText({
      model: cerebras(model),
      prompt: `You are a transcription correction assistant. Your ONLY job is to fix likely speech-to-text errors based on a custom dictionary of domain-specific terms.

DICTIONARY (words the user expects to appear):
${dictionary.map((word) => `- ${word}`).join("\n")}

RAW TRANSCRIPTION (from speech-to-text):
"${rawTranscript}"

INSTRUCTIONS:
1. Look for words that sound similar to dictionary terms but were incorrectly transcribed
2. Replace misheard words with the correct dictionary terms
3. ONLY fix words that are likely transcription errors - do NOT change the meaning
4. Preserve the original structure, punctuation, and capitalization style
5. If no corrections are needed, return the exact original text

OUTPUT: Return ONLY the corrected transcription, nothing else. No explanations, no quotes, no prefixes.`,
      maxTokens: 500,
      temperature: 0, // Deterministic for consistency
    });

    const wasModified = correctedText.trim() !== rawTranscript.trim();
    
    console.log("[STT Correction] Result:", {
      original: rawTranscript,
      corrected: correctedText.trim(),
      wasModified,
    });

    return { correctedText: correctedText.trim(), wasModified };
  } catch (error) {
    console.error("[STT Correction] Correction failed, using original:", error);
    return { correctedText: rawTranscript, wasModified: false };
  }
}

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
    const dictionaryRaw = formData.get("dictionary") as string | null;

    // Parse dictionary if provided
    let dictionary: string[] = [];
    if (dictionaryRaw) {
      try {
        dictionary = JSON.parse(dictionaryRaw);
      } catch {
        console.warn("[STT Debug] Failed to parse dictionary, ignoring");
      }
    }

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log("[STT Debug] Received audio file:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      dictionaryWords: dictionary.length,
    });

    // Convert File to Uint8Array
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);

    console.log("[STT Debug] Audio data size:", audioData.length, "bytes");

    // Step 1: Speech-to-Text with ElevenLabs
    const { text: rawTranscript } = await transcribe({
      model: elevenlabs.transcription("scribe_v2"),
      audio: audioData,
      providerOptions: {
        elevenlabs: {
          languageCode: "en",
          tagAudioEvents: false,
        },
      },
    });

    console.log("[STT Debug] Raw transcription:", rawTranscript);

    // Step 2: Correct transcription using dictionary (if provided)
    const { correctedText, wasModified } = await correctTranscription(
      rawTranscript,
      dictionary
    );

    if (wasModified) {
      console.log("[STT Debug] Transcription corrected:", {
        original: rawTranscript,
        corrected: correctedText,
      });
    }

    return NextResponse.json({
      transcript: correctedText,
      rawTranscript: wasModified ? rawTranscript : undefined,
      corrected: wasModified,
    });
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
