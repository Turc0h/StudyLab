export type OcclusionShape = "rect" | "ellipse" | "polygon";
export type OcclusionMode = "normal" | "grouped" | "combined";

export interface OcclusionPoint {
  x: number; // 0..1
  y: number; // 0..1
}

export interface OcclusionMask {
  id: string;
  shape: OcclusionShape;
  x: number; // 0..1 (top-left)
  y: number; // 0..1 (top-left)
  width: number; // 0..1
  height: number; // 0..1
  points?: OcclusionPoint[]; // 0..1 coords for polygons
  label: string; // The answer / term being hidden
  groupId?: string; // Grouping ID for grouped cloze
}

export interface OcclusionSheet {
  id: string;
  fileId?: string;
  sourceTitle: string;
  pageNumber?: number;
  imageUrl?: string;
  conceptId?: string;
  mode: OcclusionMode;
  masks: OcclusionMask[];
  createdAt: number;
}
