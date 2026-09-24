/**
 * StudyLab Native Knowledge Graph Bridge
 * Connects React / TypeScript presentation to Rust native domain logic.
 *
 * Implements transparent fallback:
 * - Desktop (Tauri 2): Executes in Rust (DFS/BFS DAG cycle validation, path reconstruction)
 * - Web / Fallback: Executes deterministic TypeScript fallback
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform.ts";
import { wouldCreateCycle } from "../features/knowledge-graph/graphEngine.ts";
import type { ConceptEdgeRecord } from "../db/db.ts";

export interface EdgeInput {
  sourceId: string;
  targetId: string;
}

export interface CheckCycleRequest {
  edges: EdgeInput[];
  sourceId: string;
  targetId: string;
}

export interface CheckCycleResponse {
  wouldCreateCycle: boolean;
  cyclePath?: string[] | null;
  visitedNodesCount: number;
  checkedAtMs: number;
  sourceEngine: "rust" | "typescript-fallback";
}

export interface NativeGraphError {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

/**
 * Validates whether adding a dependency edge between concepts creates a cycle.
 * Invokes Rust backend when running in Tauri; seamlessly falls back to TypeScript in web.
 */
export async function checkGraphCycleNative(
  request: CheckCycleRequest,
): Promise<CheckCycleResponse> {
  const { edges, sourceId, targetId } = request;

  if (isDesktop()) {
    try {
      const rustResponse = await invoke<Omit<CheckCycleResponse, "sourceEngine">>(
        "check_knowledge_graph_cycle",
        {
          request: {
            edges: edges.map((e) => ({
              sourceId: e.sourceId,
              targetId: e.targetId,
            })),
            sourceId,
            targetId,
          },
        },
      );

      return {
        ...rustResponse,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn(
        "[nativeGraph] Fallback a motor TypeScript debido a error o contexto IPC:",
        err,
      );
    }
  }

  // TypeScript fallback execution
  const mappedEdges: ConceptEdgeRecord[] = edges.map((e) => ({
    id: `temp-${e.sourceId}-${e.targetId}`,
    sourceConceptId: e.sourceId,
    targetConceptId: e.targetId,
    type: "prerequisite",
    strength: 1.0,
    createdAt: new Date(),
  }));

  const cycle = wouldCreateCycle(mappedEdges, sourceId, targetId);

  return {
    wouldCreateCycle: cycle,
    cyclePath: cycle ? [sourceId, targetId] : null,
    visitedNodesCount: edges.length + 2,
    checkedAtMs: Date.now(),
    sourceEngine: "typescript-fallback",
  };
}
