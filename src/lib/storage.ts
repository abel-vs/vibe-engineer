import type { Edge, Node } from "@xyflow/react";
import { IDBPDatabase, openDB } from "idb";
import type { DiagramMode } from "./modes";
import type { DiagramStyle } from "./styles";

const DB_NAME = "voice-diagram-db";
const DB_VERSION = 1;
const STORE_NAME = "diagrams";

export interface SavedDiagram {
  id: string;
  name: string;
  mode: DiagramMode;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveDiagram(diagram: SavedDiagram): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, diagram);
}

export async function loadDiagram(
  id: string
): Promise<SavedDiagram | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function listDiagrams(): Promise<SavedDiagram[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(tx.objectStoreNames[0]);
  const index = store.index("updatedAt");
  const diagrams = await index.getAll();
  return diagrams.reverse(); // Most recent first
}

export async function deleteDiagram(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function getLastDiagram(): Promise<SavedDiagram | undefined> {
  const diagrams = await listDiagrams();
  return diagrams[0];
}

// Session auto-save functionality (survives refresh, clears on tab close)
const SESSION_SAVE_KEY = "voice-diagram-session";

export function autoSave(
  nodes: Node[],
  edges: Edge[],
  mode: DiagramMode,
  style: DiagramStyle = "engineering"
): void {
  const data = {
    nodes,
    edges,
    mode,
    style,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(SESSION_SAVE_KEY, JSON.stringify(data));
}

export function loadAutoSave(): {
  nodes: Node[];
  edges: Edge[];
  mode: DiagramMode;
  style: DiagramStyle;
} | null {
  const data = sessionStorage.getItem(SESSION_SAVE_KEY);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    // Backward compatible: default to "engineering" if style is missing
    return {
      ...parsed,
      style: parsed.style ?? "engineering",
    };
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  sessionStorage.removeItem(SESSION_SAVE_KEY);
}

// Per-mode workspace storage (each mode has its own canvas state)
const WORKSPACE_PREFIX = "voice-diagram-workspace-";

export interface WorkspaceState {
  nodes: Node[];
  edges: Edge[];
  style: DiagramStyle;
  timestamp: number;
}

export function saveWorkspace(mode: DiagramMode, state: WorkspaceState): void {
  const key = `${WORKSPACE_PREFIX}${mode}`;
  sessionStorage.setItem(key, JSON.stringify(state));
}

export function loadWorkspace(mode: DiagramMode): WorkspaceState | null {
  const key = `${WORKSPACE_PREFIX}${mode}`;
  const data = sessionStorage.getItem(key);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return {
      nodes: parsed.nodes ?? [],
      edges: parsed.edges ?? [],
      style: parsed.style ?? "engineering",
      timestamp: parsed.timestamp ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearWorkspace(mode: DiagramMode): void {
  const key = `${WORKSPACE_PREFIX}${mode}`;
  sessionStorage.removeItem(key);
}

export function clearAllWorkspaces(): void {
  const modes: DiagramMode[] = ["playground", "bfd", "pfd", "pid"];
  modes.forEach((mode) => clearWorkspace(mode));
}
