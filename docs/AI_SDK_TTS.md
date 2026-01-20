# Text-to-Speech (TTS) with ElevenLabs

The app uses ElevenLabs TTS via the AI SDK to provide voice feedback when executing commands.

## How it works

1. The AI has a `speak_response` tool that it calls to provide voice feedback
2. The tool captures a short message (under 100 characters)
3. After all tool execution completes, TTS is generated server-side using ElevenLabs
4. The audio is returned as base64 in the response
5. The client plays the audio automatically

## Configuration

Uses the `eleven_flash_v2_5` model for low latency. Voice ID `JBFqnCBsd6RMkjVDRZzb` (George - natural, friendly voice).

## Example messages

- "Done! Added a reactor and pump."
- "Got it, canvas is clear."
- "Connected those nodes for you."
