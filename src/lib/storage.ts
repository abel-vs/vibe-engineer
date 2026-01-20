import { openDB, IDBPDatabase } from "idb";
import type { Node, Edge } from "@xyflow/react";
import type { DiagramMode } from "./modes";

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

export async function loadDiagram(id: string): Promise<SavedDiagram | undefined> {
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
  mode: DiagramMode
): void {
  const data = {
    nodes,
    edges,
    mode,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(SESSION_SAVE_KEY, JSON.stringify(data));
}

export function loadAutoSave(): {
  nodes: Node[];
  edges: Edge[];
  mode: DiagramMode;
} | null {
  const data = sessionStorage.getItem(SESSION_SAVE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  sessionStorage.removeItem(SESSION_SAVE_KEY);
}
