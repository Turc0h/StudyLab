import { db, type ConceptRecord, type ConceptEdgeRecord, type ReviewLogRecord, type CardFsrsRecord } from "../../db/db";
import { calculateHalfLife } from "../fsrs/fsrsModel";

export interface GraphNode extends ConceptRecord {
  inDegree: number;
  outDegree: number;
  downstreamCount: number;
  isBottleneck: boolean;
  bottleneckScore: number;
}

export interface BottleneckReport {
  conceptId: string;
  name: string;
  bottleneckScore: number;
  downstreamImpactCount: number;
  lapseCount: number;
  retrievability: number;
  reason: string;
}

/**
 * Checks if adding an edge from source to target would create a cycle in the DAG.
 * Returns true if a cycle WOULD be created (i.e. invalid).
 */
export function wouldCreateCycle(
  edges: ConceptEdgeRecord[],
  newSourceId: string,
  newTargetId: string,
): boolean {
  if (newSourceId === newTargetId) return true;

  // Build adjacency list: target -> list of concepts that depend on it
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.sourceConceptId)) {
      adj.set(edge.sourceConceptId, []);
    }
    adj.get(edge.sourceConceptId)!.push(edge.targetConceptId);
  }

  // If we can reach newSourceId starting from newTargetId, then adding newSourceId -> newTargetId creates a cycle
  const visited = new Set<string>();
  const queue = [newTargetId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === newSourceId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return false;
}

/**
 * Evaluates node statuses dynamically based on prerequisite retrievability and mastery.
 * Condition: Locked if any prerequisite has R < 0.70 or masteryScore < 0.70.
 */
export function evaluateNodeAvailability(
  concepts: ConceptRecord[],
  edges: ConceptEdgeRecord[],
): ConceptRecord[] {
  const conceptMap = new Map<string, ConceptRecord>(concepts.map((c) => [c.id, { ...c }]));

  // Build prerequisite mapping (targetConcept depends on sourceConcept)
  const prereqMap = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type === "prerequisite") {
      const targetId = edge.targetConceptId;
      if (!prereqMap.has(targetId)) prereqMap.set(targetId, []);
      prereqMap.get(targetId)!.push(edge.sourceConceptId);
    }
  }

  // Also account for concept.prerequisites array
  for (const concept of concepts) {
    if (concept.prerequisites && concept.prerequisites.length > 0) {
      if (!prereqMap.has(concept.id)) prereqMap.set(concept.id, []);
      for (const pId of concept.prerequisites) {
        if (!prereqMap.get(concept.id)!.includes(pId)) {
          prereqMap.get(concept.id)!.push(pId);
        }
      }
    }
  }

  return concepts.map((concept) => {
    const prereqIds = prereqMap.get(concept.id) || [];
    let isPrereqSatisfied = true;

    for (const pId of prereqIds) {
      const parent = conceptMap.get(pId);
      if (parent) {
        // If prerequisite retrievability < 0.70 or mastery < 0.70, child is locked
        if (parent.currentRetrievability < 0.70 || parent.masteryScore < 0.70) {
          isPrereqSatisfied = false;
          break;
        }
      }
    }

    let status = concept.status;
    if (!isPrereqSatisfied && prereqIds.length > 0) {
      status = "locked";
    } else {
      if (concept.masteryScore >= 0.85 && concept.currentRetrievability >= 0.80) {
        status = "mastered";
      } else if (concept.masteryScore > 0 || concept.status === "in_progress") {
        status = "in_progress";
      } else {
        status = "available";
      }
    }

    return {
      ...concept,
      status,
    };
  });
}

/**
 * Identifies cognitive bottleneck concepts holding back downstream mastery.
 * Computes downstream impact and correlates with card lapse rates.
 */
export function identifyBottlenecks(
  concepts: ConceptRecord[],
  edges: ConceptEdgeRecord[],
  reviewLogs: ReviewLogRecord[],
  cards: CardFsrsRecord[],
): BottleneckReport[] {
  const reports: BottleneckReport[] = [];
  const conceptToCards = new Map<string, CardFsrsRecord[]>();

  for (const card of cards) {
    if (card.conceptId) {
      if (!conceptToCards.has(card.conceptId)) conceptToCards.set(card.conceptId, []);
      conceptToCards.get(card.conceptId)!.push(card);
    }
  }

  // Count lapses per card
  const cardLapseCount = new Map<string, number>();
  for (const log of reviewLogs) {
    if (log.rating === 1) {
      cardLapseCount.set(log.cardId, (cardLapseCount.get(log.cardId) || 0) + 1);
    }
  }

  // Build downstream dependency tree: how many nodes depend on each node
  const downstreamAdj = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type === "prerequisite") {
      if (!downstreamAdj.has(edge.sourceConceptId)) downstreamAdj.set(edge.sourceConceptId, []);
      downstreamAdj.get(edge.sourceConceptId)!.push(edge.targetConceptId);
    }
  }

  for (const concept of concepts) {
    // Count all reachable downstream nodes
    const visited = new Set<string>();
    const queue = [...(downstreamAdj.get(concept.id) || [])];
    while (queue.length > 0) {
      const next = queue.shift()!;
      if (!visited.has(next)) {
        visited.add(next);
        const children = downstreamAdj.get(next) || [];
        queue.push(...children);
      }
    }

    const downstreamImpactCount = visited.size;

    // Count lapses in this concept
    const relatedCards = conceptToCards.get(concept.id) || [];
    let lapseCount = 0;
    for (const c of relatedCards) {
      lapseCount += cardLapseCount.get(c.id) || c.lapses;
    }

    // High impact + low retrievability / high lapses = high bottleneck score
    const retrievabilityDeficit = Math.max(0, 1.0 - concept.currentRetrievability);
    const bottleneckScore = Number(
      (downstreamImpactCount * 2.5 + lapseCount * 1.8 + retrievabilityDeficit * 5).toFixed(2),
    );

    if (downstreamImpactCount > 0 && (concept.currentRetrievability < 0.75 || lapseCount > 1)) {
      reports.push({
        conceptId: concept.id,
        name: concept.name,
        bottleneckScore,
        downstreamImpactCount,
        lapseCount,
        retrievability: concept.currentRetrievability,
        reason: `Bloquea ${downstreamImpactCount} concepto(s) dependiente(s) con ${lapseCount} fallas acumuladas y R=${(concept.currentRetrievability * 100).toFixed(0)}%`,
      });
    }
  }

  // Sort descending by bottleneck impact score
  return reports.sort((a, b) => b.bottleneckScore - a.bottleneckScore);
}

/**
 * Initializes default starter concepts if IndexedDB has none.
 */
export async function seedDefaultKnowledgeGraph(): Promise<void> {
  const existing = await db.concepts.count();
  if (existing > 0) return;

  const now = Date.now();
  const defaultConcepts: ConceptRecord[] = [
    {
      id: "concept-working-memory",
      domainId: "neuroscience",
      name: "Memoria de Trabajo y Carga Cognitiva",
      description: "Límites del buffer fonológico y visoespacial (7±2 items de Miller, Sweller).",
      masteryScore: 0.92,
      currentRetrievability: 0.95,
      status: "mastered",
      prerequisites: [],
      tags: ["neurociencia", "atencion"],
      createdAt: now,
    },
    {
      id: "concept-fsrs-spaced-repetition",
      domainId: "neuroscience",
      name: "Curva de Olvido y FSRS v4.5",
      description: "Modelado de Retrievability R(t,S), Estabilidad S y Dificultad D.",
      masteryScore: 0.88,
      currentRetrievability: 0.91,
      status: "mastered",
      prerequisites: ["concept-working-memory"],
      tags: ["memoria", "algoritmos"],
      createdAt: now,
    },
    {
      id: "concept-synaptic-plasticity",
      domainId: "neuroscience",
      name: "Plasticidad Sináptica y LTP",
      description: "Potenciación a largo plazo mediada por receptores NMDA y AMPA.",
      masteryScore: 0.76,
      currentRetrievability: 0.78,
      status: "in_progress",
      prerequisites: ["concept-working-memory"],
      tags: ["neurobiologia"],
      createdAt: now,
    },
    {
      id: "concept-socratic-decomposition",
      domainId: "pedagogy",
      name: "Deconstrucción Socrática y Feynman",
      description: "Detección de tautologías, sesgos de jerga y aislamiento de contraejemplos.",
      masteryScore: 0.65,
      currentRetrievability: 0.68,
      status: "locked", // locked because R < 0.70
      prerequisites: ["concept-fsrs-spaced-repetition", "concept-synaptic-plasticity"],
      tags: ["metacognicion", "feynman"],
      createdAt: now,
    },
    {
      id: "concept-method-of-loci",
      domainId: "mnemonics",
      name: "Palacio de la Memoria (Método de Loci)",
      description: "Mapeo espacial de representaciones abstractas en arquitecturas 3D.",
      masteryScore: 0.82,
      currentRetrievability: 0.84,
      status: "available",
      prerequisites: ["concept-working-memory"],
      tags: ["espacial", "mnemotecnia"],
      createdAt: now,
    },
    {
      id: "concept-adaptive-interleaving",
      domainId: "pedagogy",
      name: "Entrelazado Adaptativo y Discriminación",
      description: "Inyección de alta interferencia contextual para eliminar sesgo de familiaridad.",
      masteryScore: 0.60,
      currentRetrievability: 0.62,
      status: "locked",
      prerequisites: ["concept-socratic-decomposition"],
      tags: ["interleaving"],
      createdAt: now,
    },
  ];

  const defaultEdges: ConceptEdgeRecord[] = [
    {
      id: "edge-1",
      sourceConceptId: "concept-working-memory",
      targetConceptId: "concept-fsrs-spaced-repetition",
      type: "prerequisite",
      strength: 1.0,
    },
    {
      id: "edge-2",
      sourceConceptId: "concept-working-memory",
      targetConceptId: "concept-synaptic-plasticity",
      type: "prerequisite",
      strength: 0.85,
    },
    {
      id: "edge-3",
      sourceConceptId: "concept-working-memory",
      targetConceptId: "concept-method-of-loci",
      type: "prerequisite",
      strength: 0.9,
    },
    {
      id: "edge-4",
      sourceConceptId: "concept-fsrs-spaced-repetition",
      targetConceptId: "concept-socratic-decomposition",
      type: "prerequisite",
      strength: 0.75,
    },
    {
      id: "edge-5",
      sourceConceptId: "concept-synaptic-plasticity",
      targetConceptId: "concept-socratic-decomposition",
      type: "prerequisite",
      strength: 0.8,
    },
    {
      id: "edge-6",
      sourceConceptId: "concept-socratic-decomposition",
      targetConceptId: "concept-adaptive-interleaving",
      type: "prerequisite",
      strength: 1.0,
    },
  ];

  await db.transaction("rw", [db.concepts, db.conceptEdges, db.cardsFsrs], async () => {
    await db.concepts.bulkAdd(defaultConcepts);
    await db.conceptEdges.bulkAdd(defaultEdges);

    // Create cards attached to concepts
    await db.cardsFsrs.bulkAdd([
      {
        id: "card-fsrs-1",
        deckId: "deck-cognitive-science",
        conceptId: "concept-working-memory",
        front: "¿Cuál es el límite clásico de la memoria de trabajo según George Miller?",
        back: "7 ± 2 elementos (chunks). Investigaciones modernas (Cowan) sugieren 4 chunks en atención focalizada.",
        state: "review",
        stability: 18.5,
        difficulty: 3.2,
        reps: 5,
        lapses: 0,
        lastReview: now - 2 * 24 * 60 * 60 * 1000,
        dueDate: now + 16 * 24 * 60 * 60 * 1000,
        halfLife: calculateHalfLife(18.5),
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
      },
      {
        id: "card-fsrs-2",
        deckId: "deck-cognitive-science",
        conceptId: "concept-fsrs-spaced-repetition",
        front: "En FSRS v4.5, ¿qué representa matemáticamente la Estabilidad S?",
        back: "El intervalo de tiempo en días requerido para que la probabilidad de recuerdo (Retrievability R) descienda al 90%.",
        state: "review",
        stability: 12.0,
        difficulty: 4.1,
        reps: 4,
        lapses: 1,
        lastReview: now - 1 * 24 * 60 * 60 * 1000,
        dueDate: now + 11 * 24 * 60 * 60 * 1000,
        halfLife: calculateHalfLife(12.0),
        createdAt: now - 20 * 24 * 60 * 60 * 1000,
      },
      {
        id: "card-fsrs-3",
        deckId: "deck-cognitive-science",
        conceptId: "concept-synaptic-plasticity",
        front: "¿Por qué el receptor NMDA actúa como un detector de coincidencia molecular en LTP?",
        back: "Requiere despolarización de la membrana postsináptica para expulsar el ion Mg²⁺ que bloquea su poro Y la unión simultánea de glutamato.",
        state: "learning",
        stability: 3.5,
        difficulty: 6.8,
        reps: 2,
        lapses: 2,
        lastReview: now - 2 * 24 * 60 * 60 * 1000,
        dueDate: now + 1 * 24 * 60 * 60 * 1000,
        halfLife: calculateHalfLife(3.5),
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
      },
    ]);
  });
}
