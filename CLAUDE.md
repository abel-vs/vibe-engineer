# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voice Diagram is a voice-controlled process engineering diagramming application built with Next.js. Users speak commands to create and manipulate diagrams (add shapes, connect them, move nodes) through an AI-powered voice pipeline.

## Commands

```bash
pnpm dev        # Start development server (http://localhost:3000)
pnpm build      # Production build
pnpm lint       # Run ESLint
```

## Environment Variables

Required in `.env.local`:
- `CEREBRAS_API_KEY` - Cerebras API key for AI tool calling
- `ELEVENLABS_API_KEY` - ElevenLabs API key for speech-to-text
- `CEREBRAS_MODEL` - Optional, defaults to "zai-glm-4.7"

## Architecture

### Voice Command Pipeline

1. **Voice Input** (`src/components/voice-controller.tsx`) - Push-to-talk recording via MediaRecorder API
2. **STT** (`src/app/api/transcribe/route.ts`) - ElevenLabs scribe_v1 via `@ai-sdk/elevenlabs`
3. **AI Processing** (`src/app/api/voice-command/route.ts`) - Cerebras LLM with tool calling via `ToolLoopAgent` from AI SDK
4. **State Update** (`src/hooks/use-voice-commands.ts`) - Applies tool results to diagram state

### Key Data Flow

```
User speaks → ElevenLabs STT → Transcript
                                    ↓
                              Voice Command API
                                    ↓
                    buildSystemPrompt() includes current diagram state
                                    ↓
                         Cerebras ToolLoopAgent
                                    ↓
                    Tool calls (add_node, add_edge, etc.)
                                    ↓
                    applyToolResults() → Zustand store → React Flow canvas
```

### State Management

- **Zustand store** (`src/hooks/use-diagram-store.ts`) - Central state for nodes, edges, mode, selection
- **AI State Tracker** (in `voice-command/route.ts`) - Server-side state mirror for multi-turn tool execution
- **Auto-save** (`src/lib/storage.ts`) - SessionStorage persistence

### Diagram Modes

Three modes with different available shapes (`src/lib/modes.ts`):
- **Playground** - Basic shapes: rectangle, circle, diamond, triangle, text
- **BFD** (Block Flow Diagram) - process_block, input_output, storage
- **PFD** (Process Flow Diagram) - reactor, tank, vessel, pump, heat_exchanger, column, etc.

### AI Tools (`src/lib/ai-tools.ts`)

Tools defined with Zod schemas and registered via AI SDK's `zodSchema()`:
- `add_node` - Add shapes to canvas
- `add_edge` - Connect nodes
- `remove_node` / `remove_edge` - Delete elements
- `update_node` / `update_edge` - Modify properties
- `move_node` - Reposition (absolute, relative, or directional)
- `select_elements` - Change selection
- `clear_canvas` - Reset diagram

### React Flow Integration

- Custom node types per mode in `src/components/nodes/` (playground-nodes.tsx, bfd-nodes.tsx, pfd-nodes.tsx)
- All nodes extend `BaseNodeComponent` with standard handles
- Custom stream edge in `src/components/edges/stream-edge.tsx`
- Drag-and-drop from `ShapeToolbar` to canvas

## File Structure

```
src/
├── app/
│   ├── page.tsx                 # Main UI with canvas, toolbar, voice controller
│   └── api/
│       ├── voice-command/route.ts   # Cerebras tool-calling endpoint
│       └── transcribe/route.ts      # ElevenLabs STT endpoint
├── components/
│   ├── diagram-canvas.tsx       # React Flow wrapper
│   ├── voice-controller.tsx     # Push-to-talk UI
│   ├── nodes/                   # Custom node components by mode
│   ├── edges/                   # Custom edge components
│   └── toolbar/                 # Shape palette
├── hooks/
│   ├── use-diagram-store.ts     # Zustand store
│   └── use-voice-commands.ts    # Voice command processing + tool result application
└── lib/
    ├── ai-tools.ts              # Tool schemas (Zod)
    ├── ai-prompt.ts             # System prompt builder with diagram state
    ├── modes.ts                 # Mode definitions and rules
    ├── diagram-state.ts         # State serialization for AI context
    └── storage.ts               # LocalStorage/SessionStorage helpers
```

## Key Patterns

### Multi-turn Tool Calling

The voice-command API uses `ToolLoopAgent` with `maxSteps: 10` to handle commands like "add a rectangle and circle and connect them" which require:
1. Add both nodes (parallel)
2. Get node IDs from results
3. Add edge using those IDs

### State Synchronization

The AI receives current diagram state via `serializeDiagramForAI()` which includes nodes, edges, mode rules, and selection. Server-side `createStateTracker()` mirrors state changes during multi-turn execution so subsequent tool calls see accurate state.

### Node Type to Component Mapping

When AI calls `add_node({ nodeType: "rectangle" })`, React Flow looks up the component from `allNodeTypes` which merges all mode-specific node type registrations.
