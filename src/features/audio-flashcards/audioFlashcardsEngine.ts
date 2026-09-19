import { db } from "../../db/db";

export interface AudioFlashcardItem {
  id: string;
  question: string;
  answer: string;
  subject: string;
  topic: string;
  estimatedSeconds?: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface AudioFlashcardPlaylist {
  id: string;
  title: string;
  subject: string;
  description: string;
  cards: AudioFlashcardItem[];
}

export interface AudioPlaybackSettings {
  recallPauseSeconds: number; // Seconds of silence to recall before answer
  answerPauseSeconds: number; // Seconds of silence after answer before next card
  speechRate: number; // 0.75x to 1.75x
  speechPitch: number; // 0.8 to 1.2
  selectedVoiceName: string | null;
  loopPlaylist: boolean;
  announceCardIndex: boolean;
  beepCue: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioPlaybackSettings = {
  recallPauseSeconds: 6,
  answerPauseSeconds: 3,
  speechRate: 1.0,
  speechPitch: 1.0,
  selectedVoiceName: null,
  loopPlaylist: true,
  announceCardIndex: true,
  beepCue: true,
};

// -----------------------------------------------------------------------------
// PRESET ACADEMIC PLAYLISTS (Medicina, Derecho, Ingeniería)
// -----------------------------------------------------------------------------

export const PRESET_AUDIO_PLAYLISTS: AudioFlashcardPlaylist[] = [
  {
    id: "playlist-cardio-pharma",
    title: "Cardiología Clínica & Farmacología de Guardia",
    subject: "Medicina & Ciencias de la Salud",
    description: "Evocación auditiva activa de fármacos inotrópicos, antiarrítmicos, FA y urgencias de shock para repasar en traslados o caminatas.",
    cards: [
      {
        id: "ac-med-1",
        question: "¿Cuál es el beneficio hemodinámico y celular primordial de los inhibidores de SGLT2 en la insuficiencia cardíaca?",
        answer: "Producen natriuresis osmótica reduciendo precarga y poscarga sin activar el simpático, y mejoran la bioenergética miocárdica disminuyendo hospitalizaciones.",
        subject: "Medicina & Ciencias de la Salud",
        topic: "Insuficiencia Cardíaca",
        difficulty: 3,
      },
      {
        id: "ac-med-2",
        question: "¿Cuáles son los 4 pilares farmacológicos que reducen mortalidad en insuficiencia cardíaca con fracción de eyección reducida?",
        answer: "1) ARNI (Sacubitril/Valsartán) o IECA; 2) Betabloqueantes cardioselectivos; 3) Antagonistas del receptor mineralocorticoide como Espironolactona; y 4) Inhibidores de SGLT2.",
        subject: "Medicina & Ciencias de la Salud",
        topic: "Insuficiencia Cardíaca",
        difficulty: 4,
      },
      {
        id: "ac-med-3",
        question: "¿Qué toxicidades extracardíacas críticas deben monitorearse durante el tratamiento crónico con Amiodarona?",
        answer: "Fibrosis pulmonar intersticial, disfunción tiroidea por sobrecarga de yodo, depósitos corneales y toxicidad hepática con elevación de transaminasas.",
        subject: "Medicina & Ciencias de la Salud",
        topic: "Antiarrítmicos",
        difficulty: 4,
      },
      {
        id: "ac-med-4",
        question: "¿Cuál es la conducta terapéutica formalmente contraindicada ante un shock cardiogénico por infarto de ventrículo derecho?",
        answer: "La administración de diuréticos de asa y nitratos vasodilatadores, ya que colapsan la precarga del ventrículo derecho dependiente de volumen.",
        subject: "Medicina & Ciencias de la Salud",
        topic: "Shock y Cuidados Críticos",
        difficulty: 4,
      },
      {
        id: "ac-med-5",
        question: "¿Qué score clínico indica el umbral de anticoagulación obligatoria en Fibrilación Auricular no valvular?",
        answer: "El score CHA2DS2-VASc con puntaje mayor o igual a dos en hombres o tres en mujeres, priorizando anticoagulantes orales directos.",
        subject: "Medicina & Ciencias de la Salud",
        topic: "Arritmias",
        difficulty: 3,
      },
      {
        id: "ac-med-6",
        question: "¿Cuál es el fármaco vasopresor de primera línea para restaurar la presión arterial media en el shock séptico refractario?",
        answer: "Noradrenalina en infusión continua, titulada hasta alcanzar una PAM objetivo mayor o igual a 65 milímetros de mercurio.",
        subject: "Medicina & Ciencias de la Salud",
        topic: "Shock y Cuidados Críticos",
        difficulty: 2,
      },
    ],
  },
  {
    id: "playlist-civil-contracts",
    title: "Obligaciones & Contratos Civiles y Comerciales",
    subject: "Derecho Civil & Comercial",
    description: "Active Recall auditivo del Código Civil y Comercial de la Nación: seña, imprevisión, pacto comisorio y frustración del fin.",
    cards: [
      {
        id: "ac-law-1",
        question: "¿Cuál es la regla supletoria de la seña en el Código Civil y Comercial frente al código de Vélez?",
        answer: "En el Código Civil y Comercial la seña es por regla confirmatoria, salvo pacto expreso en contrario; en el régimen derogado de Vélez era penitencial.",
        subject: "Derecho Civil & Comercial",
        topic: "Régimen de la Seña",
        difficulty: 2,
      },
      {
        id: "ac-law-2",
        question: "¿Cuáles son los requisitos de procedencia para invocar la Teoría de la Imprevisión según el artículo 1091?",
        answer: "Contrato conmutativo de ejecución diferida, alteración extraordinaria e imprevisible de las circunstancias, ajena a las partes, que vuelva la prestación excesivamente onerosa sin mora culpable.",
        subject: "Derecho Civil & Comercial",
        topic: "Teoría de la Imprevisión",
        difficulty: 4,
      },
      {
        id: "ac-law-3",
        question: "¿Cómo opera la cláusula resolutoria implícita o pacto comisorio tácito y qué plazo de intimación exige?",
        answer: "Exige emplazar fehacientemente al deudor bajo apercibimiento de resolución por un plazo mínimo de 15 días, resolviéndose de pleno derecho al vencer dicho término sin cumplimiento.",
        subject: "Derecho Civil & Comercial",
        topic: "Pacto Comisorio",
        difficulty: 3,
      },
      {
        id: "ac-law-4",
        question: "¿Qué diferencia existe entre la frustración del fin del contrato y la teoría de la imprevisión?",
        answer: "La imprevisión exige excesiva onerosidad sobreviniente de la prestación; la frustración del fin extingue la causa móvil común del contrato volviéndolo estéril sin necesidad de onerosidad.",
        subject: "Derecho Civil & Comercial",
        topic: "Ineficacia Contractual",
        difficulty: 4,
      },
      {
        id: "ac-law-5",
        question: "¿Qué efecto produce la resolución contractual respecto de terceros adquirentes de buena fe y a título oneroso?",
        answer: "La resolución no afecta los derechos adquiridos a título oneroso por terceros de buena fe sobre cosas muebles no registrables o inmuebles.",
        subject: "Derecho Civil & Comercial",
        topic: "Efectos de la Resolución",
        difficulty: 3,
      },
    ],
  },
  {
    id: "playlist-distributed-systems",
    title: "Sistemas Distribuidos & Algoritmos de Consenso",
    subject: "Ingeniería de Software & Sistemas",
    description: "Preguntas de evocación auditiva de algoritmos Raft, Teorema CAP, consistencia linearizable y transacciones distribuidas.",
    cards: [
      {
        id: "ac-eng-1",
        question: "¿Cómo garantiza el algoritmo Raft que nunca coexistan dos líderes en el mismo término?",
        answer: "Cada nodo vota por un único candidato por término y se exige quórum de mayoría estricta; como dos mayorías siempre intersecan, no pueden coexistir dos líderes electos.",
        subject: "Ingeniería de Software & Sistemas",
        topic: "Consenso Distribuido",
        difficulty: 3,
      },
      {
        id: "ac-eng-2",
        question: "¿Qué postula formalmente el Teorema CAP ante una partición de red asíncrona?",
        answer: "Que un sistema distribuido debe elegir entre consistencia fuerte (CP), rechazando operaciones para no desincronizarse, o disponibilidad (AP), sirviendo lecturas potencialmente desactualizadas.",
        subject: "Ingeniería de Software & Sistemas",
        topic: "Teorema CAP",
        difficulty: 4,
      },
      {
        id: "ac-eng-3",
        question: "¿Cuál es la principal vulnerabilidad bloqueante del protocolo Two-Phase Commit ante la caída del coordinador?",
        answer: "Los participantes que votaron confirmación en la fase de prepare quedan bloqueados indefinidamente reteniendo cerrojos, sin saber si hacer commit o rollback.",
        subject: "Ingeniería de Software & Sistemas",
        topic: "Transacciones Distribuidas",
        difficulty: 4,
      },
      {
        id: "ac-eng-4",
        question: "¿Por qué los relojes lógicos de Lamport no garantizan causalidad recíproca?",
        answer: "Porque que la marca temporal de un evento sea menor a la de otro no implica que el primero haya causado al segundo; pudieron ser eventos totalmente concurrentes. Se requieren relojes vectoriales.",
        subject: "Ingeniería de Software & Sistemas",
        topic: "Sincronización Lógica",
        difficulty: 4,
      },
      {
        id: "ac-eng-5",
        question: "¿Por qué un Filtro de Bloom nunca genera falsos negativos pero sí posibles falsos positivos?",
        answer: "Porque si un elemento fue insertado, sus bits asignados por las funciones hash siempre estarán en uno; pero colisiones acumuladas pueden encender los bits de un elemento no presente.",
        subject: "Ingeniería de Software & Sistemas",
        topic: "Estructuras Probabilísticas",
        difficulty: 3,
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// AUDIO SYNTHESIS & RECALL UTILITIES (Web Speech API + Web Audio API)
// -----------------------------------------------------------------------------

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Emits a subtle, pleasant chime/beep using Web Audio API to alert the student before answer reveal.
 */
export function playChimeCue(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Tone D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // Slide to A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // AudioContext may be restricted before user interaction
  }
}

export function speakUtterance(
  text: string,
  settings: AudioPlaybackSettings,
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.speechRate || 1.0;
    utterance.pitch = settings.speechPitch || 1.0;
    utterance.lang = "es-ES";

    // Set voice if chosen
    if (settings.selectedVoiceName) {
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) => v.name === settings.selectedVoiceName);
      if (matched) {
        utterance.voice = matched;
      }
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function getSpanishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  return voices.filter(
    (v) => v.lang.startsWith("es") || v.lang.includes("es-") || v.lang.includes("spa"),
  );
}

// -----------------------------------------------------------------------------
// HISTORIAL & SESSION PERSISTENCE
// -----------------------------------------------------------------------------

export async function saveAudioStudySessionRecord(
  playlistTitle: string,
  durationSec: number,
  cardsListenedCount: number,
  subjectFolderId: string | null = null,
): Promise<string> {
  void playlistTitle;
  void cardsListenedCount;
  const recordId = `audio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "audio-flashcards",
    subjectFolderId,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
